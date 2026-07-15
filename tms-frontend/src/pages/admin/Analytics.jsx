import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DashboardCard from '../../components/common/DashboardCard';
import Loader from '../../components/common/Loader';
import {
  getAttendanceTrend,
  getDepartmentPerformance,
  getMarksAnalysis,
  getFeedbackAnalysis,
  getDashboard,
  getAuditLogs
} from '../../api/analytics.api';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  TrendingUp, Calendar, Award, MessageSquare, Clock,
  Users, CheckSquare, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [attTrend, setAttTrend] = useState(null);
  const [deptPerf, setDeptPerf] = useState(null);
  const [marksDist, setMarksDist] = useState(null);
  const [feedbackDist, setFeedbackDist] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [trendRes, deptRes, marksRes, fbRes, dashRes, logsRes] = await Promise.all([
          getAttendanceTrend({ days: 30 }),
          getDepartmentPerformance(),
          getMarksAnalysis(),
          getFeedbackAnalysis(),
          getDashboard(),
          getAuditLogs({ limit: 5 })
        ]);

        // 1. Dashboard Cards
        if (dashRes.data.success) {
          setStats(dashRes.data.data);
        }

        // 2. Attendance Trend
        if (trendRes.data.success) {
          const trend = trendRes.data.data;
          setAttTrend({
            labels: trend.map(r => r._id),
            datasets: [{
              fill: true,
              label: 'Avg Attendance %',
              data: trend.map(r => r.avgPercentage),
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.05)',
              tension: 0.3
            }]
          });
        }

        // 3. Department Performance
        if (deptRes.data.success) {
          const dept = deptRes.data.data;
          setDeptPerf({
            labels: dept.map(d => d.department.code),
            datasets: [
              {
                label: 'Avg Attendance %',
                data: dept.map(d => parseFloat(d.attendance.avgPercentage)),
                backgroundColor: '#10b981',
                borderRadius: 5
              },
              {
                label: 'Avg Marks %',
                data: dept.map(d => parseFloat(d.marks.avgAverage)),
                backgroundColor: '#3b82f6',
                borderRadius: 5
              }
            ]
          });
        }

        // 4. Marks Distribution
        if (marksRes.data.success) {
          const marksObj = marksRes.data.data.distribution;
          setMarksDist({
            labels: ['Excellent (>=80%)', 'Good (60-79%)', 'Average (40-59%)', 'Poor (<40%)'],
            datasets: [{
              data: [marksObj.excellent, marksObj.good, marksObj.average, marksObj.poor],
              backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e'],
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.05)'
            }]
          });
        }

        // 5. Feedback Ratings
        if (fbRes.data.success) {
          const fb = fbRes.data.data.distribution;
          const starsMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          fb.forEach(item => { starsMap[item._id] = item.count; });

          setFeedbackDist({
            labels: ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star'],
            datasets: [{
              label: 'Rating Count',
              data: [starsMap[1], starsMap[2], starsMap[3], starsMap[4], starsMap[5]],
              backgroundColor: '#f59e0b',
              borderRadius: 5
            }]
          });
        }

        // 6. Recent Activities
        if (logsRes.data.success) {
          setActivities(logsRes.data.data);
        }

      } catch {
        toast.error('Failed to load analytics dashboards.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af', font: { family: 'Inter', size: 11 } } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af' }, min: 0 }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#9ca3af', font: { family: 'Inter', size: 11 } } }
    }
  };

  if (loading) return <Loader />;

  return (
    <AdminLayout>
      <PageHeader title="Analytics & Trends" subtitle="Detailed performance breakdown of college training sessions" />

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Avg Training Attendance"
          value={`${stats?.todayAttendancePercentage ?? 0}%`}
          subtitle="Cumulative daily average"
          icon={CheckSquare}
          colorClass="stat-card-blue"
        />
        <DashboardCard
          title="Aggregate Student Marks"
          value={`${stats?.averageMarks ?? 0}%`}
          subtitle="Average across all tests"
          icon={Award}
          colorClass="stat-card-purple"
        />
        <DashboardCard
          title="Submitted Feedbacks"
          value={stats?.totalFeedback ?? 0}
          subtitle="Collected training reviews"
          icon={MessageSquare}
          colorClass="stat-card-emerald"
        />
        <DashboardCard
          title="Active Students"
          value={stats?.totalStudents ?? 0}
          subtitle="Enrolled placement candidates"
          icon={Users}
          colorClass="stat-card-cyan"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-cyan-400" size={18} />
            <h3 className="text-white text-sm font-bold font-display">30-Day Attendance Trend</h3>
          </div>
          <div className="h-72">
            {attTrend ? <Line data={attTrend} options={chartOptions} /> : null}
          </div>
        </div>

        {/* Dept Performance */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-emerald-400" size={18} />
            <h3 className="text-white text-sm font-bold font-display">Department Performance</h3>
          </div>
          <div className="h-72">
            {deptPerf ? <Bar data={deptPerf} options={chartOptions} /> : null}
          </div>
        </div>

        {/* Marks Analysis */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-purple-400" size={18} />
            <h3 className="text-white text-sm font-bold font-display">Marks Analysis</h3>
          </div>
          <div className="h-72">
            {marksDist ? <Doughnut data={marksDist} options={doughnutOptions} /> : null}
          </div>
        </div>

        {/* Feedback Analysis */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="text-amber-400" size={18} />
            <h3 className="text-white text-sm font-bold font-display">Student Feedback Summary</h3>
          </div>
          <div className="h-72">
            {feedbackDist ? <Bar data={feedbackDist} options={chartOptions} /> : null}
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="glass-card p-6 mt-8">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
          <Activity className="text-primary-400" size={18} />
          <h3 className="text-white text-sm font-bold font-display">Recent Activities</h3>
        </div>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No recent system activities found.</p>
          ) : (
            activities.map((act) => (
              <div key={act._id} className="flex items-start justify-between text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex gap-3">
                  <div className="p-1.5 bg-white/5 rounded-lg text-gray-400 mt-0.5">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{act.description}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      Actor: {act.performedByName} ({act.performedByRole}) • IP: {act.ipAddress}
                    </p>
                  </div>
                </div>
                <span className="text-gray-500 text-[10px]">
                  {new Date(act.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
