import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import {
  getCoordinators,
  createCoordinator,
  updateCoordinator,
  deleteCoordinator
} from '../../api/coordinators.api';
import { getDepartments } from '../../api/departments.api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoordinatorManagement() {
  const [coordinators, setCoordinators] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Forms Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoordinators = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCoordinators({
        search,
        department: selectedDept,
        page,
        limit: 10,
        status: 'all' // Show both active and inactive
      });
      if (data.success) {
        setCoordinators(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load coordinators');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, page]);

  useEffect(() => {
    fetchCoordinators();
  }, [fetchCoordinators]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { data } = await getDepartments({ limit: 100 });
        if (data.success) setDepartments(data.data);
      } catch {}
    };
    fetchDepts();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setUsername('');
    setPassword('');
    setName('');
    setEmail('');
    setDepartment(departments[0]?._id || '');
    setPhone('');
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEdit = (coord) => {
    setEditId(coord._id);
    setUsername(coord.username);
    setPassword('');
    setName(coord.name);
    setEmail(coord.email || '');
    setDepartment(coord.department?._id || '');
    setPhone(coord.phone || '');
    setStatus(coord.status);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username || (!editId && !password) || !name || !department) {
      return toast.error('Username, password (for new users), name, and department are required');
    }
    setSaving(true);
    try {
      let res;
      if (editId) {
        res = await updateCoordinator(editId, { name, email, department, phone, status, ...(password && { password }) });
      } else {
        res = await createCoordinator({ username, password, name, email, department, phone });
      }
      if (res.data.success) {
        toast.success(res.data.message || 'Saved successfully');
        setModalOpen(false);
        fetchCoordinators();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred during save');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteCoordinator(deleteId);
      if (res.data.success) {
        toast.success('Coordinator deactivated successfully (soft delete)');
        setDeleteOpen(false);
        fetchCoordinators();
      }
    } catch {
      toast.error('Could not deactivate coordinator');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'username', label: 'Username', className: 'font-bold text-white' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department', render: (row) => row.department?.code || '-' },
    { key: 'email', label: 'Email', render: (row) => row.email || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge text={row.status} type={row.status === 'Active' ? 'success' : 'danger'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-24 text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="btn-icon text-blue-400 hover:bg-blue-500/10"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          {row.status === 'Active' && (
            <button
              onClick={() => handleOpenDelete(row._id)}
              className="btn-icon text-rose-400 hover:bg-rose-500/10"
              title="Deactivate"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Department Coordinator Management"
        subtitle="Create and manage department staff credentials"
        actions={
          <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>Add Coordinator</span>
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search name/username..." />
        <select
          value={selectedDept}
          onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={coordinators}
        loading={loading}
        emptyMessage="No coordinators found."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Coordinator Details' : 'Add Coordinator'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="input-field"
                disabled={!!editId}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password {editId && '(leave blank to keep current)'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input-field"
                required={!editId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                className="input-field"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coord@college.edu"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="select-field"
                required
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="input-field"
              />
            </div>
          </div>

          {editId && (
            <div className="input-group">
              <label className="input-label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="select-field"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive (Soft Deleted)</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/5">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Deactivate Coordinator Account?"
        message="Are you sure you want to deactivate this coordinator profile? They will no longer be able to log in to mark attendance or grades."
        confirmText="Deactivate"
        type="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}
