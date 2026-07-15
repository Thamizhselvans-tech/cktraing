import { useState, useEffect } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import DashboardCard from '../../components/common/DashboardCard';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { getStudentAttendance } from '../../api/attendance.api';
import { getStudentMarks } from '../../api/marks.api';
import { getInternalTimetable, getExternalTimetable } from '../../api/timetable.api';
import { BookOpen, Calendar, ClipboardCheck, GraduationCap, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendancePct, setAttendancePct] = useState(0);
  const [marksAvg, setMarksAvg] = useState(null);
  const [todayTraining, setTodayTraining] = useState(null);
  const [upcomingTraining, setUpcomingTraining] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?._id) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [attRes, marksRes, internalRes, externalRes] = await Promise.all([
          getStudentAttendance(user._id),
          getStudentMarks(user._id).catch(() => ({ data: { success: false } })), // handle no marks entered
          getInternalTimetable({ department: user.department?._id, limit: 5 }),
          getExternalTimetable({ department: user.department?._id, limit: 5 })
        ]);

        // 1. Attendance %
        if (attRes.data.success) {
          setAttendancePct(attRes.data.data.summary.overallPercentage);
        }

        // 2. Marks Average
        if (marksRes.data?.success) {
          setMarksAvg(marksRes.data.data.average);
        }

        // 3. Timetable matching
        const allSessions = [
          ...(internalRes.data.success ? internalRes.data.data.map(s => ({ ...s, type: 'Internal' })) : []),
          ...(externalRes.data.success ? externalRes.data.data.map(s => ({ ...s, type: 'External' })) : [])
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find today's training
        const todaySessions = allSessions.filter(s => {
          const sDate = new Date(s.date).toISOString().split('T')[0];
          return sDate === todayStr;
        });

        if (todaySessions.length > 0) {
          setTodayTraining(`${todaySessions[0].title} (${todaySessions[0].type})`);
        } else {
          setTodayTraining('No Training Today');
        }

        // Find upcoming training
        const upcomingSessions = allSessions.filter(s => {
          const sDate = new Date(s.date).toISOString().split('T')[0];
          return sDate > todayStr;
        });

        if (upcomingSessions.length > 0) {
          const next = upcomingSessions[0];
          setUpcomingTraining(`${next.title} on ${new Date(next.date).toLocaleDateString('en-IN')}`);
        } else {
          setUpcomingTraining('No Upcoming Training');
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) return <Loader />;

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-gray-400 mt-1">Here is a summary of your training stats and schedule.</p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <DashboardCard
            title="Today's Training"
            value={todayTraining}
            subtitle="Current session schedule"
            icon={Clock}
            colorClass="stat-card-blue"
          />
          <DashboardCard
            title="Upcoming Training"
            value={upcomingTraining}
            subtitle="Next scheduled session"
            icon={Calendar}
            colorClass="stat-card-purple"
          />
          <DashboardCard
            title="Attendance Percentage"
            value={`${attendancePct}%`}
            subtitle="Overall attendance record"
            icon={ClipboardCheck}
            colorClass="stat-card-emerald"
            trend={attendancePct >= 75 ? { type: 'up', value: 'On Track' } : { type: 'down', value: 'Low' }}
          />
          <DashboardCard
            title="Latest Marks Avg"
            value={marksAvg !== null ? `${marksAvg}%` : 'N/A'}
            subtitle="Mock test average score"
            icon={BookOpen}
            colorClass="stat-card-amber"
          />
          <DashboardCard
            title="Department"
            value={user?.department?.code || ''}
            subtitle={user?.department?.name || ''}
            icon={GraduationCap}
            colorClass="stat-card-cyan"
          />
        </div>
      </div>
    </StudentLayout>
  );
}
