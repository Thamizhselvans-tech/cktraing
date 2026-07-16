import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentsExcel,
  getUploadedFiles,
  deleteUploadedFile
} from '../../api/students.api';
import { getDepartments } from '../../api/departments.api';
import { resetStudentPassword } from '../../api/auth.api';
import { Plus, Edit2, Trash2, Key, Upload, FileSpreadsheet, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Forms Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [regNo, setRegNo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState(1);
  const [batch, setBatch] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  // Excel Modal
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Sub Tab and Uploaded Files list
  const [activeSubTab, setActiveSubTab] = useState('database'); // 'database' or 'files'
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotalPages, setFilesTotalPages] = useState(1);

  // File Delete Dialog States
  const [fileDeleteOpen, setFileDeleteOpen] = useState(false);
  const [fileDeleteId, setFileDeleteId] = useState(null);
  const [deleteStudentsCheck, setDeleteStudentsCheck] = useState(false);
  const [fileDeleting, setFileDeleting] = useState(false);

  // Dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [resetting, setResetting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getStudents({
        search,
        department: selectedDept,
        year: selectedYear,
        page,
        limit: 10,
        status: 'all' // Show both active and inactive
      });
      if (data.success) {
        setStudents(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedYear, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
    setRegNo('');
    setName('');
    setEmail('');
    setDepartment(departments[0]?._id || '');
    setYear(1);
    setBatch('');
    setPhone('');
    setStatus('Active');
    setModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditId(student._id);
    setRegNo(student.registerNumber);
    setName(student.name);
    setEmail(student.email || '');
    setDepartment(student.department?._id || '');
    setYear(student.year || 1);
    setBatch(student.batch || '');
    setPhone(student.phone || '');
    setStatus(student.status);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!regNo || !name || !department) return toast.error('Register number, Name, and Department are required.');
    setSaving(true);
    try {
      let res;
      if (editId) {
        res = await updateStudent(editId, { name, email, department, year, batch, phone, status });
      } else {
        res = await createStudent({ registerNumber: regNo, name, email, department, year, batch, phone });
      }
      if (res.data.success) {
        toast.success(res.data.message || 'Saved successfully');
        setModalOpen(false);
        fetchStudents();
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
      const res = await deleteStudent(deleteId);
      if (res.data.success) {
        toast.success('Student deactivated successfully (soft delete)');
        setDeleteOpen(false);
        fetchStudents();
      }
    } catch {
      toast.error('Could not deactivate student');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenReset = (id) => {
    setResetId(id);
    setResetOpen(true);
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      const res = await resetStudentPassword(resetId);
      if (res.data.success) {
        toast.success(res.data.message || 'Password reset to Register Number');
        setResetOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setResetting(false);
    }
  };

  const fetchUploadedFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const { data } = await getUploadedFiles({ page: filesPage, limit: 10 });
      if (data.success) {
        setUploadedFiles(data.data);
        setFilesTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load uploaded files list');
    } finally {
      setFilesLoading(false);
    }
  }, [filesPage]);

  useEffect(() => {
    if (activeSubTab === 'files') {
      fetchUploadedFiles();
    }
  }, [activeSubTab, fetchUploadedFiles]);

  const handleExcelUploadSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) return toast.error('Please select an Excel file');
    const formData = new FormData();
    formData.append('file', excelFile);

    setUploading(true);
    setUploadResult(null);
    try {
      const { data } = await uploadStudentsExcel(formData);
      if (data.success) {
        setUploadResult(data.data);
        toast.success('Excel upload complete');
        fetchStudents();
        fetchUploadedFiles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDeleteFile = (id) => {
    setFileDeleteId(id);
    setDeleteStudentsCheck(false);
    setFileDeleteOpen(true);
  };

  const handleConfirmDeleteFile = async () => {
    setFileDeleting(true);
    try {
      const res = await deleteUploadedFile(fileDeleteId, deleteStudentsCheck);
      if (res.data.success) {
        toast.success(res.data.message || 'File record deleted successfully');
        setFileDeleteOpen(false);
        fetchUploadedFiles();
        if (deleteStudentsCheck) {
          fetchStudents();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete file');
    } finally {
      setFileDeleting(false);
    }
  };

  const columns = [
    { key: 'registerNumber', label: 'Reg No', className: 'font-bold text-white' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department', render: (row) => row.department?.code || '-' },
    { key: 'year', label: 'Year', render: (row) => row.year || '-' },
    { key: 'batch', label: 'Batch', render: (row) => row.batch || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge text={row.status} type={row.status === 'Active' ? 'success' : 'danger'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-36 text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenReset(row._id)}
            className="btn-icon text-amber-400 hover:bg-amber-500/10"
            title="Reset Password"
          >
            <Key size={14} />
          </button>
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

  const fileColumns = [
    { key: 'originalName', label: 'File Name', className: 'font-semibold text-slate-800' },
    { key: 'size', label: 'File Size', render: (row) => row.size ? `${(row.size / 1024).toFixed(2)} KB` : '-' },
    { key: 'studentIds', label: 'Imported Students', render: (row) => <Badge text={`${row.studentIds?.length || 0} Students`} type="info" /> },
    { key: 'uploadedBy', label: 'Uploaded By', render: (row) => row.uploadedBy?.name || 'Admin' },
    { key: 'createdAt', label: 'Upload Date', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : '-' },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-20 text-right',
      render: (row) => (
        <button
          onClick={() => handleOpenDeleteFile(row._id)}
          className="btn-icon text-rose-500 hover:bg-rose-500/10"
          title="Delete Uploaded File"
        >
          <Trash2 size={14} />
        </button>
      )
    }
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Student Management"
        subtitle="Manage student portal credentials and department assignments"
        actions={
          <div className="flex items-center gap-3">
            <button onClick={() => { setExcelOpen(true); setUploadResult(null); setExcelFile(null); }} className="btn-secondary flex items-center gap-2">
              <Upload size={16} />
              <span>Import Excel</span>
            </button>
            <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              <span>Add Student</span>
            </button>
          </div>
        }
      />

      {/* Sub Tabs switcher */}
      <div className="flex border-b border-slate-200 mb-6 bg-slate-100 p-1 rounded-xl max-w-sm">
        <button
          onClick={() => setActiveSubTab('database')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeSubTab === 'database' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Students Database
        </button>
        <button
          onClick={() => setActiveSubTab('files')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeSubTab === 'files' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Uploaded Import Files
        </button>
      </div>

      {activeSubTab === 'database' ? (
        <>
          {/* Filter and Search */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            <div className="sm:col-span-2">
              <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} placeholder="Search name/reg no..." />
            </div>
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
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
              className="select-field"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <DataTable
            columns={columns}
            data={students}
            loading={loading}
            emptyMessage="No students found."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <DataTable
          columns={fileColumns}
          data={uploadedFiles}
          loading={filesLoading}
          emptyMessage="No Excel files uploaded yet."
          page={filesPage}
          totalPages={filesTotalPages}
          onPageChange={setFilesPage}
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Student Details' : 'Add New Student'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Register Number</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="Enter register number"
                className="input-field"
                disabled={!!editId}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Student Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                className="input-field"
              />
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="input-group sm:col-span-2">
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
              <label className="input-label">Year of Study</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="select-field"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Batch (e.g. 2022-2026)</label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="Batch"
                className="input-field"
              />
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
          </div>

          {!editId && (
            <p className="text-[10px] text-gray-500 pt-2">
              * Note: The student's initial password will be automatically set to their Register Number. They will be forced to change it on their first successful login.
            </p>
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

      {/* Excel Upload Modal */}
      <Modal isOpen={excelOpen} onClose={() => setExcelOpen(false)} title="Bulk Import Students via Excel" size="lg">
        <form onSubmit={handleExcelUploadSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-dark-800/40">
            <FileSpreadsheet size={48} className="text-primary-400 mb-3" />
            <p className="text-sm text-gray-300 font-medium">Select Excel spreadsheet to upload</p>
            <p className="text-xs text-gray-500 mt-1">Columns must include: registerNumber, name, department</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Other optional fields: email, year, batch, phone</p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setExcelFile(e.target.files[0])}
              className="mt-6 text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-600/20 file:text-primary-300 hover:file:bg-primary-600/30"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <p className="text-[10px] text-amber-500">
              * Note: Temporary password for newly imported students will be their Department Code (e.g. CSE).
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setExcelOpen(false)} className="btn-secondary">
                Close
              </button>
              <button type="submit" disabled={uploading} className="btn-primary">
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
        </form>

        {/* Upload Summary Feedback */}
        {uploadResult && (
          <div className="mt-6 border-t border-white/10 pt-6 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Upload Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="text-emerald-400" size={18} />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Success</p>
                  <p className="text-lg font-bold text-white">{uploadResult.success}</p>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
                <XCircle className="text-amber-400" size={18} />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Skipped</p>
                  <p className="text-lg font-bold text-white">{uploadResult.skipped}</p>
                </div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2">
                <XCircle className="text-rose-400" size={18} />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Failed</p>
                  <p className="text-lg font-bold text-white">{uploadResult.failed}</p>
                </div>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="glass-card max-h-[200px] overflow-y-auto mt-4 p-4 border border-white/10 rounded-xl">
                <h5 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Upload Error Log</h5>
                <ul className="space-y-1 text-xs">
                  {uploadResult.errors.map((err, idx) => (
                    <li key={idx} className="text-rose-400">
                      Row {err.row}: <span className="text-gray-300">{err.reason}</span> {err.registerNumber ? `(RegNo: ${err.registerNumber})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reset Password Confirm */}
      <ConfirmDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Password to Default?"
        message="Reset password for this student to their Department Code (e.g. CSE). They will be forced to change it on their next login."
        confirmText="Reset Password"
        type="warning"
        loading={resetting}
      />

      {/* Delete/Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Deactivate Student Account?"
        message="Are you sure you want to deactivate this student? They will no longer be able to log in, but historical marks/attendance are preserved."
        confirmText="Deactivate"
        type="danger"
        loading={deleting}
      />
      {/* Delete Uploaded File Confirmation Modal */}
      <Modal isOpen={fileDeleteOpen} onClose={() => setFileDeleteOpen(false)} title="Delete Uploaded File Record?" size="sm">
        <div className="flex flex-col items-center text-center p-4 space-y-4">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
            <AlertTriangle size={32} />
          </div>
          <p className="text-slate-700 text-sm">
            Are you sure you want to delete this Excel file record from the system?
          </p>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-left">
            <input
              type="checkbox"
              id="deleteStudentsCheck"
              checked={deleteStudentsCheck}
              onChange={(e) => setDeleteStudentsCheck(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
            />
            <label htmlFor="deleteStudentsCheck" className="text-xs text-slate-700 font-medium cursor-pointer select-none">
              Also delete all student records imported by this file
            </label>
          </div>
          <div className="flex items-center gap-3 w-full pt-4">
            <button
              onClick={() => setFileDeleteOpen(false)}
              disabled={fileDeleting}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteFile}
              disabled={fileDeleting}
              className="btn-danger flex-1"
            >
              {fileDeleting ? 'Deleting...' : 'Delete File'}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
