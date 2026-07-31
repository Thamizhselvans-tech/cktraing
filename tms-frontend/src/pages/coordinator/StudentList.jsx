import { useState, useEffect, useCallback } from 'react';
import CoordinatorLayout from '../../components/layout/CoordinatorLayout';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByDept } from '../../api/students.api';
import toast from 'react-hot-toast';

export default function StudentList() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStudents = useCallback(async () => {
    const deptId = typeof user?.department === 'object' ? user?.department?._id : user?.department;
    if (!deptId) return;

    setLoading(true);
    try {
      const { data } = await getStudentsByDept(deptId, {
        search,
        page,
        limit: 10,
      });
      if (data.success) {
        setStudents(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      toast.error('Failed to load students list');
    } finally {
      setLoading(false);
    }
  }, [user, search, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const columns = [
    { key: 'registerNumber', label: 'Register No', className: 'font-bold text-white' },
    { key: 'name', label: 'Student Name' },
    { key: 'email', label: 'Email', render: (row) => row.email || '-' },
    { key: 'year', label: 'Year', render: (row) => `${row.year} Year` },
    { key: 'batch', label: 'Batch', render: (row) => row.batch || '-' },
    { key: 'phone', label: 'Contact', render: (row) => row.phone || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge text={row.status} type={row.status === 'Active' ? 'success' : 'danger'} />,
    },
  ];

  const deptName = typeof user?.department === 'object' ? user?.department?.name : 'department';

  return (
    <CoordinatorLayout>
      <PageHeader
        title="Student Directory"
        subtitle={`Directory list of students registered in the ${deptName || 'department'}`}
      />

      <div className="mb-6">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search name or register number..." />
      </div>

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        emptyMessage="No students found in this department."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </CoordinatorLayout>
  );
}
