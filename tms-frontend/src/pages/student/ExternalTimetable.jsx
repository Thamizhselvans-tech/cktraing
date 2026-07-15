import { useState, useEffect, useCallback } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { getExternalTimetable } from '../../api/timetable.api';
import toast from 'react-hot-toast';

export default function ExternalTimetable() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTimetable = useCallback(async () => {
    if (!user?.department?._id) return;
    setLoading(true);
    try {
      const { data } = await getExternalTimetable({
        department: user.department._id,
        page,
        limit: 10
      });
      if (data.success) {
        setTimetable(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load external timetable.');
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const columns = [
    { key: 'title', label: 'Session Title', className: 'font-semibold text-white' },
    { key: 'company', label: 'Company Name', className: 'font-semibold text-primary-400' },
    { key: 'date', label: 'Date', render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-' },
    { key: 'timing', label: 'Session Timing', render: (row) => (row.startTime && row.endTime) ? `${row.startTime} - ${row.endTime}` : '-' },
    { key: 'venue', label: 'Venue Location', render: (row) => row.venue || '-' },
    { key: 'contactPerson', label: 'Contact Person', render: (row) => row.contactPerson || '-' },
    {
      key: 'status',
      label: 'Session Status',
      render: (row) => (
        <Badge
          text={(row.status || 'scheduled').toUpperCase()}
          type={row.status === 'completed' ? 'success' : row.status === 'cancelled' ? 'danger' : 'info'}
        />
      ),
    },
  ];

  return (
    <StudentLayout>
      <PageHeader title="External Timetable" subtitle="Company-conducted training sessions (Infosys, TCS, Zoho, CTS, HCL, etc.)" />

      <DataTable
        columns={columns}
        data={timetable}
        loading={loading}
        emptyMessage="No external training sessions scheduled for your department."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </StudentLayout>
  );
}
