import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CoordinatorLayout from '../../components/layout/CoordinatorLayout';
import DashboardCard from '../../components/common/DashboardCard';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByDept } from '../../api/students.api';
import { getDepartmentAttendance } from '../../api/attendance.api';
import { getDepartmentMarks } from '../../api/marks.api';
import { ClipboardCheck, Users, BookOpen, GraduationCap, Calendar, BarChart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [todayAttendancePct, setTodayAttendancePct] = useState(0);
  const [marksCount, setMarksCount] = useState(0);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user?.department?._id) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [studentsRes, attendanceRes, marksRes] = await Promise.all([
          getStudentsByDept(user.department._id, { limit: 1 }),
          getDepartmentAttendance(user.department._id, { date: todayStr }),
          getDepartmentMarks(user.department._id, { limit: 100 })
        ]);

        if (studentsRes.data.success) {
          setStudentCount(studentsRes.data.pagination.total);
        }

        if (attendanceRes.data.success) {
          const records = attendanceRes.data.data;
          const totalRecords = records.length;
          const pct = totalRecords > 0
            ? parseFloat((records.reduce((sum, r) => sum + r.percentage, 0) / totalRecords).toFixed(2))
            : 0;
          setTodayAttendancePct(pct);
        }

        if (marksRes.data.success) {
          setMarksCount(marksRes.data.pagination.total);
        }

      } catch (err) {
        toast.error('Failed to load dashboard information.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (loading) return <Loader />;

  return (
    <CoordinatorLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Coordinator Dashboard</h2>
          <p className="text-xs text-gray-400 mt-1">Management overview for department: <span className="font-semibold text-primary-400">{user?.department?.name || ''}</span></p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Department"
            value={user?.department?.code || ''}
            subtitle={user?.department?.name || 'Department Name'}
            icon={GraduationCap}
            colorClass="stat-card-blue"
          />
          <DashboardCard
            title="Today's Attendance"
            value={`${todayAttendancePct}%`}
            subtitle="Today's session summary"
            icon={ClipboardCheck}
            colorClass="stat-card-emerald"
          />
          <DashboardCard
            title="Total Students"
            value={studentCount}
            subtitle="Registered in department"
            icon={Users}
            colorClass="stat-card-purple"
          />
          <DashboardCard
            title="Grades Recorded"
            value={`${marksCount} / ${studentCount}`}
            subtitle="Marks entry status"
            icon={BookOpen}
            colorClass="stat-card-amber"
          />
        </div>

        {/* Quick Links / Tasks */}
        <div className="mt-8">
          <h3 className="text-base font-bold text-white mb-4 font-display">Quick Management Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => navigate('/coordinator/attendance')}
              className="glass-card-hover p-6 cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Mark Attendance</h4>
                <p className="text-xs text-gray-400 mt-1">Record today's morning/afternoon attendance.</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/coordinator/marks')}
              className="glass-card-hover p-6 cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Enter Test Marks</h4>
                <p className="text-xs text-gray-400 mt-1">Record Mock, Aptitude, and Tech scores.</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/coordinator/schedule')}
              className="glass-card-hover p-6 cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">View Timetables</h4>
                <p className="text-xs text-gray-400 mt-1">Check scheduled training calendars.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CoordinatorLayout>
  );
}
