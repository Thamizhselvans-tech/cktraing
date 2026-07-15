import { useState, useEffect, useCallback } from 'react';
import CoordinatorLayout from '../../components/layout/CoordinatorLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { getInternalTimetable, getExternalTimetable } from '../../api/timetable.api';
import { Calendar, User, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TrainingSchedule() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('internal');
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSchedule = useCallback(async () => {
    if (!user?.department?._id) return;
    setLoading(true);
    try {
      let res;
      const params = { department: user.department._id, page, limit: 10 };

      if (activeTab === 'internal') {
        res = await getInternalTimetable(params);
      } else {
        res = await getExternalTimetable(params);
      }

      if (res.data.success) {
        setSchedule(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load training schedules');
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, page]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const getStatusType = (stat) => {
    if (stat === 'completed') return 'success';
    if (stat === 'cancelled') return 'danger';
    return 'info';
  };

  const columns = [
    { key: 'title', label: 'Event Title', className: 'font-semibold text-white' },
    { key: 'date', label: 'Date', render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-' },
    { key: 'time', label: 'Timing', render: (row) => (row.startTime && row.endTime) ? `${row.startTime} - ${row.endTime}` : '-' },
    { key: 'venue', label: 'Venue', render: (row) => row.venue || '-' },
    ...(activeTab === 'internal'
      ? [{ key: 'trainer', label: 'Trainer', render: (row) => row.trainer || '-' }]
      : [{ key: 'company', label: 'Visiting Company', render: (row) => row.company || '-', className: 'font-semibold text-primary-400' }]),
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge text={(row.status || 'scheduled').toUpperCase()} type={getStatusType(row.status || 'scheduled')} />,
    },
  ];

  return (
    <CoordinatorLayout>
      <PageHeader title="Training Schedule" subtitle="View internal and external training events scheduled for your department" />

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 bg-dark-800/40 p-1 rounded-xl max-w-xs">
        <button
          onClick={() => { setActiveTab('internal'); setPage(1); }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeTab === 'internal' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-gray-400 hover:text-white'
          }`}
        >
          Internal
        </button>
        <button
          onClick={() => { setActiveTab('external'); setPage(1); }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeTab === 'external' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-gray-400 hover:text-white'
          }`}
        >
          External
        </button>
      </div>

      <DataTable
        columns={columns}
        data={schedule}
        loading={loading}
        emptyMessage={`No ${activeTab} sessions scheduled for your department.`}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </CoordinatorLayout>
  );
}
