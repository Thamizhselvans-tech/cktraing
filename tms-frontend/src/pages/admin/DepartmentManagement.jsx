import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../api/departments.api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  // Confirm Dialog State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getDepartments({ search, page, limit: 10 });
      if (data.success) {
        setDepartments(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setCode('');
    setDescription('');
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditId(dept._id);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
    setStatus(dept.status);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !code) return toast.error('Name and Code are required');
    setSaving(true);
    try {
      let res;
      if (editId) {
        res = await updateDepartment(editId, { name, code, description, status });
      } else {
        res = await createDepartment({ name, code, description });
      }
      if (res.data.success) {
        toast.success(res.data.message || 'Saved successfully');
        setModalOpen(false);
        fetchDepartments();
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
      const res = await deleteDepartment(deleteId);
      if (res.data.success) {
        toast.success(res.data.message || 'Department deactivated successfully');
        setDeleteOpen(false);
        fetchDepartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not deactivate department');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'code', label: 'Code', className: 'font-bold text-white' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
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
              title="Deactivate (Soft Delete)"
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
        title="Department Management"
        subtitle="Manage college course divisions and departments"
        actions={
          <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>Add Department</span>
          </button>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search departments..." />
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        emptyMessage="No departments found."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="input-group">
            <label htmlFor="dept-code" className="input-label">Department Code (e.g. CSE)</label>
            <input
              id="dept-code"
              name="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="input-field"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="dept-name" className="input-label">Department Name</label>
            <input
              id="dept-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="input-field"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="dept-description" className="input-label">Description</label>
            <textarea
              id="dept-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
              className="input-field min-h-[80px]"
            />
          </div>
          {editId && (
            <div className="input-group">
              <label htmlFor="dept-status" className="input-label">Status</label>
              <select
                id="dept-status"
                name="status"
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

      {/* Delete/Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Deactivate Department?"
        message="Are you sure you want to deactivate this department? Active students will block this operation."
        confirmText="Deactivate"
        type="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}
