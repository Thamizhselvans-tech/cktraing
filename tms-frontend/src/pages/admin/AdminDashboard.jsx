import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import DashboardCard from '../../components/common/DashboardCard';
import Loader from '../../components/common/Loader';
import { getDashboard, getAttendanceTrend, getDepartmentPerformance } from '../../api/analytics.api';
import {
  Users, UserCog, Building2, CheckSquare, Award, MessageSquare, Bell,
  Calendar, TrendingUp
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [deptData, setDeptData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashRes, trendRes, deptRes] = await Promise.allSettled([
          getDashboard(),
          getAttendanceTrend({ days: 7 }),
          getDepartmentPerformance()
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value?.data?.success) {
          setStats(dashRes.value.data.data);
        } else {
          setStats({
            totalStudents: 0,
            totalCoordinators: 0,
            totalDepartments: 0,
            todayAttendanceCount: 0,
            todayAttendancePercentage: 0,
            averageMarks: 0,
            totalFeedback: 0,
            unreviewedFeedback: 0
          });
        }

        if (trendRes.status === 'fulfilled' && trendRes.value?.data?.success) {
          const rawTrend = trendRes.value.data.data;
          if (Array.isArray(rawTrend) && rawTrend.length > 0) {
            setTrendData({
              labels: rawTrend.map(r => r._id),
              datasets: [
                {
                  fill: true,
                  label: 'Average Attendance %',
                  data: rawTrend.map(r => r.avgPercentage),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                }
              ]
            });
          }
        }

        if (deptRes.status === 'fulfilled' && deptRes.value?.data?.success) {
          const rawDept = deptRes.value.data.data;
          if (Array.isArray(rawDept) && rawDept.length > 0) {
            setDeptData({
              labels: rawDept.map(d => d.department?.code || 'Dept'),
              datasets: [
                {
                  label: 'Attendance %',
                  data: rawDept.map(d => parseFloat(d.attendance?.avgPercentage || 0)),
                  backgroundColor: '#10b981',
                  borderRadius: 6,
                },
                {
                  label: 'Average Marks',
                  data: rawDept.map(d => parseFloat(d.marks?.avgAverage || 0)),
                  backgroundColor: '#8b5cf6',
                  borderRadius: 6,
                }
              ]
            });
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#9ca3af', font: { family: 'Inter' } }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' },
        min: 0,
        max: 100
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Dashboard</h2>
          <p className="text-xs text-gray-400 mt-1">Real-time statistics and overview of college training activities.</p>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Total Students"
            value={stats?.totalStudents ?? 0}
            subtitle="Active student profiles"
            icon={Users}
            colorClass="stat-card-blue"
          />
          <DashboardCard
            title="Total Coordinators"
            value={stats?.totalCoordinators ?? 0}
            subtitle="Department coordinators"
            icon={UserCog}
            colorClass="stat-card-purple"
          />
          <DashboardCard
            title="Departments"
            value={stats?.totalDepartments ?? 0}
            subtitle="Registered course branches"
            icon={Building2}
            colorClass="stat-card-emerald"
          />
          <DashboardCard
            title="Today's Attendance"
            value={`${stats?.todayAttendancePercentage ?? 0}%`}
            subtitle={`${stats?.todayAttendanceCount ?? 0} marked today`}
            icon={CheckSquare}
            colorClass="stat-card-cyan"
            trend={stats?.todayAttendancePercentage >= 75 ? { type: 'up', value: 'Good' } : { type: 'down', value: 'Review' }}
          />
          <DashboardCard
            title="Average Marks"
            value={stats?.averageMarks ?? 0}
            subtitle="Overall test aggregate"
            icon={Award}
            colorClass="stat-card-amber"
          />
          <DashboardCard
            title="Total Feedbacks"
            value={stats?.totalFeedback ?? 0}
            subtitle="From all training sessions"
            icon={MessageSquare}
            colorClass="stat-card-rose"
          />
          <DashboardCard
            title="Unreviewed Feedbacks"
            value={stats?.unreviewedFeedback ?? 0}
            subtitle="Pending admin review"
            icon={Bell}
            colorClass="stat-card-rose bg-gradient-card"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-blue-400" size={20} />
              <h3 className="text-base font-bold text-white">Attendance Trend (7 Days)</h3>
            </div>
            <div className="h-72">
              {trendData ? (
                <Line data={trendData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">No trend data available</div>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-emerald-400" size={20} />
              <h3 className="text-base font-bold text-white">Department Performance</h3>
            </div>
            <div className="h-72">
              {deptData ? (
                <Bar data={deptData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">No department data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
