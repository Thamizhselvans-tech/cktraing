import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { getAuditLogs } from '../../api/analytics.api';
import toast from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UNLOCK', 'LOCK', 'VERIFY', 'RESET_PASSWORD', 'UPLOAD'];
  const ENTITIES = ['Student', 'Coordinator', 'Department', 'Attendance', 'Marks', 'Feedback', 'InternalTimetable', 'ExternalTimetable', 'AdminSchedule'];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (action) params.action = action;
      if (entity) params.entity = entity;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const { data } = await getAuditLogs(params);
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [action, entity, startDate, endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionType = (act) => {
    if (act === 'CREATE' || act === 'LOGIN') return 'success';
    if (act === 'DELETE' || act === 'LOGOUT') return 'danger';
    if (act === 'UPDATE') return 'info';
    if (act === 'VERIFY') return 'purple';
    return 'warning';
  };

  const columns = [
    {
      key: 'action',
      label: 'Action',
      render: (row) => <Badge text={row.action} type={getActionType(row.action)} />,
    },
    { key: 'entity', label: 'Entity', className: 'font-semibold text-white' },
    { key: 'performedByName', label: 'Actor' },
    { key: 'performedByRole', label: 'Role', render: (row) => row.performedByRole?.toUpperCase() },
    { key: 'description', label: 'Description' },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'createdAt', label: 'Timestamp', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '-' },
  ];

  return (
    <AdminLayout>
      <PageHeader title="Security Audit Logs" subtitle="Traceability log tracking all actions performed across the platform" />

      {/* Filters */}
      <div className="glass-card p-6 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div className="input-group">
          <label className="input-label">Action</label>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="select-field">
            <option value="">All Actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Entity</label>
          <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className="select-field">
            <option value="">All Entities</option>
            {ENTITIES.map((ent) => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="input-field"
          />
        </div>

        <div className="input-group">
          <label className="input-label">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="input-field"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No audit logs found matching criteria."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </AdminLayout>
  );
}
