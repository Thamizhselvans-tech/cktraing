import { useState, useEffect } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { getStudentAttendance } from '../../api/attendance.api';
import { Calendar, ClipboardCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendanceSummary() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?._id) return;
      try {
        const { data } = await getStudentAttendance(user._id);
        if (data.success) {
          setAttendanceData(data.data);
        }
      } catch {
        toast.error('Failed to load attendance summary.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user]);

  const columns = [
    { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString('en-IN') },
    { key: 'morning', label: 'Morning Session', render: (row) => (row.morningSession ? 'Present' : 'Absent') },
    { key: 'afternoon', label: 'Afternoon Session', render: (row) => (row.afternoonSession ? 'Present' : 'Absent') },
    {
      key: 'percentage',
      label: 'Session Percentage',
      render: (row) => (
        <span className={row.percentage === 100 ? 'att-100' : row.percentage === 50 ? 'att-50' : 'att-0'}>
          {row.percentage}%
        </span>
      ),
    },
  ];

  if (loading) return <Loader />;

  const summary = attendanceData?.summary;
  const overallPct = summary?.overallPercentage ?? 0;

  return (
    <StudentLayout>
      <PageHeader title="Attendance Summary" subtitle="Cumulative attendance log and session percentages" />

      {/* Grid Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</p>
            <h3 className={`text-3xl font-display font-extrabold mt-2 ${
              overallPct >= 75 ? 'text-emerald-400' : overallPct >= 50 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {overallPct}%
            </h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl text-white">
            <ClipboardCheck size={22} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Days</p>
            <h3 className="text-3xl font-display font-bold text-white mt-2">{summary?.totalSessions ?? 0}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl text-white">
            <Calendar size={22} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Present Days</p>
            <h3 className="text-3xl font-display font-bold text-emerald-400 mt-2">{summary?.presentSessions ?? 0}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <ClipboardCheck size={22} />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Absent Days</p>
            <h3 className="text-3xl font-display font-bold text-rose-400 mt-2">{summary?.absentSessions ?? 0}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={attendanceData?.records || []}
        loading={false}
        emptyMessage="No attendance logs found."
      />
    </StudentLayout>
  );
}
