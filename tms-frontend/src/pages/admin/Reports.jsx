import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../../api/departments.api';
import {
  getAttendanceReport,
  getMarksReport,
  getFeedbackReport,
  getDepartmentReport,
  downloadAttendanceReport,
  downloadMarksReport,
  sendAttendanceToPrincipal,
} from '../../api/analytics.api';
import {
  FileSpreadsheet, FileText, Send, Mail, Building2, Calendar,
  Users, CheckCircle2, XCircle, Percent, Loader2, Plus, Edit2, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'attendance';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Principal Email Form State
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalDate, setPrincipalDate] = useState(new Date().toISOString().split('T')[0]);
  const [principalMessage, setPrincipalMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [principalAttendanceData, setPrincipalAttendanceData] = useState([]);
  const [principalLoading, setPrincipalLoading] = useState(false);

  // Department Add/Edit Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editDeptId, setEditDeptId] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptStatus, setDeptStatus] = useState('Active');
  const [savingDept, setSavingDept] = useState(false);

  // Department Delete State
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(false);

  // Fetch departments for dropdown
  const fetchDepts = useCallback(async () => {
    try {
      const { data } = await getDepartments({ limit: 100 });
      if (data.success) {
        setDepartments(data.data);
        if (data.data.length > 0 && !selectedDept) {
          setSelectedDept(data.data[0]._id);
        }
      }
    } catch {}
  }, [selectedDept]);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  // Automatic fetch for Principal Tab when department or date changes
  const fetchPrincipalAttendance = useCallback(async (deptId, dateStr) => {
    if (!deptId) return;
    setPrincipalLoading(true);
    try {
      const res = await getAttendanceReport({
        department: deptId,
        startDate: dateStr,
        endDate: dateStr,
      });
      if (res.data.success) {
        setPrincipalAttendanceData(res.data.data);
      }
    } catch {
      toast.error('Failed to auto-fetch attendance for selected department.');
    } finally {
      setPrincipalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'send-principal' && selectedDept) {
      fetchPrincipalAttendance(selectedDept, principalDate);
    }
  }, [activeTab, selectedDept, principalDate, fetchPrincipalAttendance]);

  const generateReport = useCallback(async () => {
    if (activeTab === 'send-principal') return;
    setLoading(true);
    try {
      let res;
      const params = {};
      if (selectedDept && selectedDept !== 'all') params.department = selectedDept;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (activeTab === 'attendance') {
        res = await getAttendanceReport(params);
      } else if (activeTab === 'marks') {
        res = await getMarksReport(params);
      } else if (activeTab === 'feedback') {
        res = await getFeedbackReport(params);
      } else {
        res = await getDepartmentReport();
      }

      if (res.data.success) {
        setReportData(res.data.data || []);
      }
    } catch {
      toast.error('Failed to generate report preview.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDept, startDate, endDate]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleDownload = async (format) => {
    try {
      const params = { format };
      if (selectedDept && selectedDept !== 'all') params.department = selectedDept;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      let res;
      let filename = '';

      if (activeTab === 'attendance') {
        res = await downloadAttendanceReport(params);
        filename = `attendance_report_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (activeTab === 'marks') {
        res = await downloadMarksReport(params);
        filename = `marks_report_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else {
        return toast.error('Downloads are supported for Attendance and Marks reports.');
      }

      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
      toast.success('Report downloaded successfully!');
    } catch {
      toast.error('Failed to download report.');
    }
  };

  // Submit Send to Principal Email
  const handleSendToPrincipal = async (e) => {
    e.preventDefault();
    if (!selectedDept) return toast.error('Please select a department.');
    if (!principalEmail || !principalEmail.trim()) return toast.error("Please enter the Principal's Email address.");

    setSendingEmail(true);
    try {
      const { data } = await sendAttendanceToPrincipal({
        department: selectedDept,
        date: principalDate,
        principalEmail: principalEmail.trim(),
        customMessage: principalMessage,
      });

      if (data.success) {
        toast.success(data.message || 'Attendance report successfully sent to Principal!');
        setPrincipalMessage('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send attendance report to Principal.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Department Handlers
  const handleOpenAddDept = () => {
    setEditDeptId(null);
    setDeptName('');
    setDeptCode('');
    setDeptDescription('');
    setDeptStatus('Active');
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    const targetId = dept._id || dept.id;
    setEditDeptId(targetId);
    setDeptName(dept.department || dept.name || '');
    setDeptCode(dept.code || '');
    setDeptDescription(dept.description || '');
    setDeptStatus(dept.status || 'Active');
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptName || !deptCode) return toast.error('Department Name and Code are required');
    setSavingDept(true);
    try {
      let res;
      if (editDeptId) {
        res = await updateDepartment(editDeptId, {
          name: deptName,
          code: deptCode,
          description: deptDescription,
          status: deptStatus,
        });
      } else {
        res = await createDepartment({
          name: deptName,
          code: deptCode,
          description: deptDescription,
        });
      }

      if (res.data.success) {
        toast.success(res.data.message || 'Department saved successfully!');
        setDeptModalOpen(false);
        fetchDepts();
        generateReport();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setSavingDept(false);
    }
  };

  const handleOpenDeleteDept = (dept) => {
    setDeletingDept(dept);
    setDeleteDeptOpen(true);
  };

  const handleConfirmDeleteDept = async () => {
    if (!deletingDept) return;
    const targetId = deletingDept._id || deletingDept.id;
    setDeletingProcess(true);
    try {
      const res = await deleteDepartment(targetId, true);
      if (res.data.success) {
        toast.success(res.data.message || 'Department deleted successfully!');
        setDeleteDeptOpen(false);
        setDeletingDept(null);
        fetchDepts();
        generateReport();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete department.');
    } finally {
      setDeletingProcess(false);
    }
  };

  // Metrics calculation for Principal Tab
  const totalPrincipalStudents = principalAttendanceData.length;
  const presentPrincipalStudents = principalAttendanceData.filter(r => r.percentage === 100).length;
  const absentPrincipalStudents = principalAttendanceData.filter(r => r.percentage === 0).length;
  const totalPrincipalPct = principalAttendanceData.reduce((sum, r) => sum + (r.percentage || 0), 0);
  const overallPrincipalPct = totalPrincipalStudents > 0
    ? parseFloat((totalPrincipalPct / totalPrincipalStudents).toFixed(2))
    : 0;

  // Dynamic columns based on active report tab
  const getColumns = () => {
    if (activeTab === 'attendance') {
      return [
        { key: 'regNo', label: 'Register No', render: (row) => row.student?.registerNumber || '-' },
        { key: 'name', label: 'Name', render: (row) => row.student?.name || '-' },
        { key: 'dept', label: 'Dept', render: (row) => row.department?.code || '-' },
        { key: 'date', label: 'Date', render: (row) => row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-' },
        { key: 'morning', label: 'Morning', render: (row) => (row.morningSession ? 'Present' : 'Absent') },
        { key: 'afternoon', label: 'Afternoon', render: (row) => (row.afternoonSession ? 'Present' : 'Absent') },
        {
          key: 'percentage',
          label: 'Percentage',
          render: (row) => (
            <span className={row.percentage === 100 ? 'att-100' : row.percentage === 50 ? 'att-50' : 'att-0'}>
              {row.percentage}%
            </span>
          ),
        },
      ];
    }

    if (activeTab === 'marks') {
      return [
        { key: 'regNo', label: 'Register No', render: (row) => row.student?.registerNumber || '-' },
        { key: 'name', label: 'Name', render: (row) => row.student?.name || '-' },
        { key: 'dept', label: 'Dept', render: (row) => row.department?.code || '-' },
        { key: 'mockTest', label: 'Mock Test' },
        { key: 'aptitude', label: 'Aptitude' },
        { key: 'technical', label: 'Technical' },
        { key: 'total', label: 'Total', className: 'font-bold text-white' },
        { key: 'average', label: 'Average', className: 'font-bold text-primary-400' },
        { key: 'verified', label: 'Verified', render: (row) => <Badge text={row.isVerified ? 'VERIFIED' : 'PENDING'} type={row.isVerified ? 'success' : 'warning'} /> },
      ];
    }

    if (activeTab === 'feedback') {
      return [
        { key: 'regNo', label: 'Register No', render: (row) => row.student?.registerNumber || '-' },
        { key: 'name', label: 'Name', render: (row) => row.student?.name || '-' },
        { key: 'rating', label: 'Rating', render: (row) => <span className="text-amber-400 font-bold">{row.rating} ★</span> },
        { key: 'description', label: 'Description', className: 'max-w-xs truncate' },
        { key: 'date', label: 'Submitted', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '-' },
      ];
    }

    // department
    return [
      { key: 'department', label: 'Department Name' },
      { key: 'code', label: 'Code', className: 'font-bold text-white' },
      { key: 'totalStudents', label: 'Total Students' },
      { key: 'avgAttendance', label: 'Avg Attendance', render: (row) => `${row.avgAttendance}%` },
      { key: 'avgMarks', label: 'Avg Marks', render: (row) => `${row.avgMarks}%` },
      { key: 'status', label: 'Status', render: (row) => <Badge text={row.status} type={row.status === 'Active' ? 'success' : 'danger'} /> },
      {
        key: 'actions',
        label: 'Actions',
        className: 'w-24 text-right',
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleOpenEditDept(row)}
              className="btn-icon text-blue-400 hover:bg-blue-500/10"
              title="Edit Department"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => handleOpenDeleteDept(row)}
              className="btn-icon text-rose-400 hover:bg-rose-500/10"
              title="Delete Department"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ];
  };

  const selectedDeptObj = departments.find(d => d._id === selectedDept);

  return (
    <AdminLayout>
      <PageHeader title="System Reports" subtitle="Generate, preview, and dispatch student training & attendance records" />

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 bg-dark-800/40 p-1 rounded-xl max-w-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setActiveTab('attendance'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all whitespace-nowrap ${
            activeTab === 'attendance' ? 'bg-primary-600 text-white shadow-glow-blue/10' : 'text-gray-400 hover:text-white'
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => { setActiveTab('marks'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all whitespace-nowrap ${
            activeTab === 'marks' ? 'bg-primary-600 text-white shadow-glow-blue/10' : 'text-gray-400 hover:text-white'
          }`}
        >
          Marks
        </button>
        <button
          onClick={() => { setActiveTab('feedback'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all whitespace-nowrap ${
            activeTab === 'feedback' ? 'bg-primary-600 text-white shadow-glow-blue/10' : 'text-gray-400 hover:text-white'
          }`}
        >
          Feedback
        </button>
        <button
          onClick={() => { setActiveTab('department'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all whitespace-nowrap ${
            activeTab === 'department' ? 'bg-primary-600 text-white shadow-glow-blue/10' : 'text-gray-400 hover:text-white'
          }`}
        >
          Department
        </button>

        <button
          onClick={() => { setActiveTab('send-principal'); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'send-principal' ? 'bg-blue-600 text-white shadow-glow-blue/10' : 'text-blue-400 hover:text-blue-300'
          }`}
        >
          <Mail size={14} />
          <span>Send to Principal</span>
        </button>
      </div>

      {activeTab === 'send-principal' ? (
        <div className="space-y-6">
          {/* Send to Principal Form */}
          <div className="glass-card p-6 border border-blue-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Mail className="text-blue-400" size={20} />
              <span>Send Attendance Report directly to Principal</span>
            </h3>

            <form onSubmit={handleSendToPrincipal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="input-group">
                  <label className="input-label flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-400" />
                    <span>Select Department *</span>
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="select-field"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-400" />
                    <span>Attendance Date *</span>
                  </label>
                  <input
                    type="date"
                    value={principalDate}
                    onChange={(e) => setPrincipalDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label flex items-center gap-1.5">
                    <Send size={14} className="text-blue-400" />
                    <span>Principal Gmail Address *</span>
                  </label>
                  <input
                    type="email"
                    value={principalEmail}
                    onChange={(e) => setPrincipalEmail(e.target.value)}
                    placeholder="principal@college.edu"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Optional Remarks / Note for Principal</label>
                <textarea
                  value={principalMessage}
                  onChange={(e) => setPrincipalMessage(e.target.value)}
                  placeholder="e.g. Please find the training attendance report for today."
                  className="input-field min-h-[70px] resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={sendingEmail || principalLoading}
                  className="btn-primary px-8 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending to Principal...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Report to Principal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Automatic Attendance Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-base flex items-center gap-2">
                <span>Live Attendance Preview</span>
                {selectedDeptObj && (
                  <span className="text-xs font-normal text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                    {selectedDeptObj.name} ({selectedDeptObj.code}) &bull; {principalDate}
                  </span>
                )}
              </h3>
              {principalLoading && (
                <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Fetching latest attendance...</span>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 flex items-center gap-3 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total Students</p>
                  <p className="text-white font-bold text-lg leading-tight mt-0.5">{totalPrincipalStudents}</p>
                </div>
              </div>

              <div className="glass-card p-4 flex items-center gap-3 border border-emerald-500/10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Present Count</p>
                  <p className="text-emerald-400 font-bold text-lg leading-tight mt-0.5">{presentPrincipalStudents}</p>
                </div>
              </div>

              <div className="glass-card p-4 flex items-center gap-3 border border-rose-500/10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <XCircle size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Absent Count</p>
                  <p className="text-rose-400 font-bold text-lg leading-tight mt-0.5">{absentPrincipalStudents}</p>
                </div>
              </div>

              <div className="glass-card p-4 flex items-center gap-3 border border-indigo-500/10">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Percent size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Attendance %</p>
                  <p className="text-indigo-400 font-bold text-lg leading-tight mt-0.5">{overallPrincipalPct}%</p>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <DataTable
              columns={[
                { key: 'regNo', label: 'Register No', render: (row) => row.student?.registerNumber || '-' },
                { key: 'name', label: 'Student Name', render: (row) => row.student?.name || '-' },
                { key: 'morning', label: 'Morning Session', render: (row) => (
                  <span className={row.morningSession ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold flex items-center gap-1'}>
                    {row.morningSession ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {row.morningSession ? 'Present' : 'Absent'}
                  </span>
                )},
                { key: 'afternoon', label: 'Afternoon Session', render: (row) => (
                  <span className={row.afternoonSession ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold flex items-center gap-1'}>
                    {row.afternoonSession ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {row.afternoonSession ? 'Present' : 'Absent'}
                  </span>
                )},
                { key: 'percentage', label: 'Attendance %', render: (row) => (
                  <span className={row.percentage === 100 ? 'att-100' : row.percentage === 50 ? 'att-50' : 'att-0'}>
                    {row.percentage}%
                  </span>
                )},
              ]}
              data={principalAttendanceData}
              loading={principalLoading}
              emptyMessage="No attendance records found for the selected department and date."
            />
          </div>
        </div>
      ) : (
        <>
          {/* Filters Area for Standard Tabs */}
          <div className="glass-card p-6 mb-6 flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1 items-end w-full">
              {activeTab !== 'department' && (
                <div className="input-group flex-1">
                  <label className="input-label">Filter Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="select-field"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'attendance' || activeTab === 'feedback' ? (
                <>
                  <div className="input-group flex-1">
                    <label className="input-label">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </>
              ) : null}

              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={generateReport} className="btn-secondary flex-1 md:flex-none">
                  Generate Preview
                </button>
                {(activeTab === 'attendance' || activeTab === 'marks') && (
                  <>
                    <button
                      onClick={() => handleDownload('excel')}
                      className="btn-success flex-1 md:flex-none flex items-center justify-center gap-2"
                      title="Download Excel"
                    >
                      <FileSpreadsheet size={16} />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="btn-danger flex-1 md:flex-none flex items-center justify-center gap-2"
                      title="Download PDF"
                    >
                      <FileText size={16} />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Add Department Button when Department Tab is Active */}
            {activeTab === 'department' && (
              <button
                onClick={handleOpenAddDept}
                className="btn-primary flex items-center gap-2 whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 px-4 py-2.5 rounded-lg"
              >
                <Plus size={16} />
                <span>Add Department</span>
              </button>
            )}
          </div>

          <DataTable
            columns={getColumns()}
            data={reportData}
            loading={loading}
            emptyMessage="No report data generated. Adjust filters and click Generate Preview."
          />
        </>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editDeptId ? 'Edit Department' : 'Add New Department'}
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          <div className="input-group">
            <label className="input-label">Department Code (e.g. CSE, ECE, IT)</label>
            <input
              type="text"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              placeholder="Enter department code"
              className="input-field"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Department Name</label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Computer Science and Engineering"
              className="input-field"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description (Optional)</label>
            <textarea
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
              placeholder="Enter description..."
              className="input-field min-h-[80px]"
            />
          </div>

          {editDeptId && (
            <div className="input-group">
              <label className="input-label">Status</label>
              <select
                value={deptStatus}
                onChange={(e) => setDeptStatus(e.target.value)}
                className="select-field"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingDept} className="btn-primary">
              {savingDept ? 'Saving...' : editDeptId ? 'Update Department' : 'Add Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Department Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDeptOpen}
        onClose={() => setDeleteDeptOpen(false)}
        onConfirm={handleConfirmDeleteDept}
        title="Delete Department?"
        message={`Are you sure you want to delete department '${deletingDept?.department || deletingDept?.name || deletingDept?.code || ''}'? This operation will remove the department record from the database.`}
        confirmText="Delete Department"
        type="danger"
        loading={deletingProcess}
      />
    </AdminLayout>
  );
}
