import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import {
  getInternalTimetable, createInternalTimetable, updateInternalTimetable, deleteInternalTimetable,
  getExternalTimetable, createExternalTimetable, updateExternalTimetable, deleteExternalTimetable,
  getSchedules, createSchedule, updateSchedule, deleteSchedule
} from '../../api/timetable.api';
import { useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../api/departments.api';
import { Plus, Edit2, Trash2, Calendar, ShieldCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TimetableManagement() {
  const { user } = useAuth();
  const isAdminOrCoordinator = user?.role === 'admin' || user?.role === 'coordinator';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'internal';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
    setPage(1);
  };
  const [departments, setDepartments] = useState([]);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // Shared Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [status, setStatus] = useState('scheduled');

  // Internal Specific Fields
  const [trainer, setTrainer] = useState('');

  // External Specific Fields
  const [company, setCompany] = useState('Infosys');
  const [contactPerson, setContactPerson] = useState('');

  // Admin Schedule Specific Fields
  const [scheduleType, setScheduleType] = useState('meeting');
  const [participants, setParticipants] = useState('');

  // Delete State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const COMPANIES = ['Infosys', 'TCS', 'Zoho', 'CTS', 'HCL', 'Wipro', 'Accenture', 'Other'];
  const SCHEDULE_TYPES = ['meeting', 'placement', 'faculty_meeting', 'coordinator_meeting', 'other'];

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (activeTab === 'internal') {
        res = await getInternalTimetable({ page, limit: 10 });
      } else if (activeTab === 'external') {
        res = await getExternalTimetable({ page, limit: 10 });
      } else {
        res = await getSchedules({ page, limit: 10 });
      }

      if (res.data.success) {
        setDataList(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load timetable records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

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
    setTitle('');
    setDescription('');
    setDepartment(departments[0]?._id || '');
    setDate('');
    setStartTime('');
    setEndTime('');
    setVenue('');
    setTrainer('');
    setCompany('Infosys');
    setContactPerson('');
    setScheduleType('meeting');
    setParticipants('');
    setStatus('scheduled');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setTitle(item.title);
    setDescription(item.description || '');
    setDepartment(item.department?._id || '');
    setDate(item.date ? new Date(item.date).toISOString().split('T')[0] : '');
    setStartTime(item.startTime || '');
    setEndTime(item.endTime || '');
    setStatus(item.status || 'scheduled');

    if (activeTab === 'internal') {
      setVenue(item.venue || '');
      setTrainer(item.trainer || '');
    } else if (activeTab === 'external') {
      setVenue(item.venue || '');
      setCompany(item.company || 'Infosys');
      setContactPerson(item.contactPerson || '');
    } else {
      setVenue(item.location || '');
      setScheduleType(item.type || 'meeting');
      setParticipants(item.participants ? item.participants.join(', ') : '');
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdminOrCoordinator) {
      return toast.error('Access denied. Only Admin or Coordinator can add or edit timetable events. Please log in as Admin!');
    }
    if (!title || !date || !startTime || !endTime) {
      return toast.error('Title, date, start and end times are required');
    }

    const payload = {
      title,
      description,
      date,
      startTime,
      endTime,
      status,
    };

    if (activeTab !== 'schedule') {
      payload.department = department || null;
      payload.venue = venue;
    }

    if (activeTab === 'internal') {
      payload.trainer = trainer;
    } else if (activeTab === 'external') {
      payload.company = company;
      payload.contactPerson = contactPerson;
    } else {
      payload.type = scheduleType;
      payload.location = venue;
      payload.participants = participants ? participants.split(',').map((p) => p.trim()) : [];
    }

    setSaving(true);
    try {
      let res;
      if (editId) {
        if (activeTab === 'internal') res = await updateInternalTimetable(editId, payload);
        else if (activeTab === 'external') res = await updateExternalTimetable(editId, payload);
        else res = await updateSchedule(editId, payload);
      } else {
        if (activeTab === 'internal') res = await createInternalTimetable(payload);
        else if (activeTab === 'external') res = await createExternalTimetable(payload);
        else res = await createSchedule(payload);
      }

      if (res.data.success) {
        toast.success(res.data.message || 'Timetable saved');
        setModalOpen(false);
        fetchTimetable();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving timetable');
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
      let res;
      if (activeTab === 'internal') res = await deleteInternalTimetable(deleteId);
      else if (activeTab === 'external') res = await deleteExternalTimetable(deleteId);
      else res = await deleteSchedule(deleteId);

      if (res.data.success) {
        toast.success('Record deleted successfully');
        setDeleteOpen(false);
        fetchTimetable();
      }
    } catch {
      toast.error('Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusType = (stat) => {
    if (stat === 'completed') return 'success';
    if (stat === 'cancelled') return 'danger';
    return 'info';
  };

  // Define columns dynamically depending on Active Tab
  const columns = [
    { key: 'title', label: 'Title', className: 'font-semibold text-white' },
    { key: 'date', label: 'Date', render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-' },
    { key: 'time', label: 'Timing', render: (row) => (row.startTime && row.endTime) ? `${row.startTime} - ${row.endTime}` : '-' },
    ...(activeTab !== 'schedule'
      ? [
          { key: 'department', label: 'Dept', render: (row) => row.department?.code || 'All' },
          { key: 'venue', label: 'Venue', render: (row) => row.venue || '-' },
        ]
      : [{ key: 'location', label: 'Location', render: (row) => row.location || '-' }]),
    ...(activeTab === 'internal'
      ? [{ key: 'trainer', label: 'Trainer', render: (row) => row.trainer || '-' }]
      : []),
    ...(activeTab === 'external'
      ? [{ key: 'company', label: 'Company', render: (row) => row.company || '-' }]
      : []),
    ...(activeTab === 'schedule'
      ? [{ key: 'type', label: 'Type', render: (row) => <Badge text={(row.type || 'other').toUpperCase()} type="purple" /> }]
      : []),
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge text={(row.status || 'scheduled').toUpperCase()} type={getStatusType(row.status || 'scheduled')} />,
    },
    ...(isAdminOrCoordinator ? [{
      key: 'actions',
      label: 'Actions',
      className: 'w-24 text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => handleOpenEdit(row)} className="btn-icon text-blue-400 hover:bg-blue-500/10">
            <Edit2 size={14} />
          </button>
          <button onClick={() => handleOpenDelete(row._id)} className="btn-icon text-rose-400 hover:bg-rose-500/10">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Timetable Management"
        subtitle="Manage College Training, Company Placements, and Administration schedules"
        actions={
          isAdminOrCoordinator ? (
            <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              <span>Add Event</span>
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 bg-dark-800/40 p-1 rounded-xl max-w-md">
        <button
          onClick={() => { setActiveTab('internal'); setPage(1); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
            activeTab === 'internal' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-gray-400 hover:text-white'
          }`}
        >
          Internal
        </button>
        <button
          onClick={() => { setActiveTab('external'); setPage(1); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
            activeTab === 'external' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-gray-400 hover:text-white'
          }`}
        >
          External
        </button>
        <button
          onClick={() => { setActiveTab('schedule'); setPage(1); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
            activeTab === 'schedule' ? 'bg-primary-600 text-white shadow-glow-blue' : 'text-gray-400 hover:text-white'
          }`}
        >
          Admin Schedule
        </button>
      </div>

      <DataTable
        columns={columns}
        data={dataList}
        loading={loading}
        emptyMessage={`No ${activeTab} timetable records found.`}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? `Edit ${activeTab.toUpperCase()} Event` : `Create ${activeTab.toUpperCase()} Event`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="input-group">
            <label className="input-label">Event Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="select-field"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Start Time (HH:MM)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">End Time (HH:MM)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          {activeTab !== 'schedule' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Target Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="select-field"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Venue</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Lab 3 / Seminar Hall"
                  className="input-field"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Schedule Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="select-field"
                >
                  {SCHEDULE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.toUpperCase().replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Boardroom / Principal Office"
                  className="input-field"
                />
              </div>
            </div>
          )}

          {activeTab === 'internal' && (
            <div className="input-group">
              <label className="input-label">Trainer Name</label>
              <input
                type="text"
                value={trainer}
                onChange={(e) => setTrainer(e.target.value)}
                placeholder="Enter trainer name"
                className="input-field"
              />
            </div>
          )}

          {activeTab === 'external' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Visiting Company</label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="select-field"
                >
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="HR Name / Representative"
                  className="input-field"
                />
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="input-group">
              <label className="input-label">Participants (comma separated)</label>
              <input
                type="text"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="e.g. Principal, HOD-CSE, Coordinators"
                className="input-field"
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Session outline, prerequisites or agenda..."
              className="input-field min-h-[85px]"
            />
          </div>

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

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Schedule Entry?"
        message="Are you sure you want to delete this schedule entry? This will remove it from all student calendars."
        confirmText="Delete"
        type="danger"
        loading={deleting}
      />
    </AdminLayout>
  );
}
