import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { getDepartments } from '../../api/departments.api';
import {
  getAttendanceReport,
  getMarksReport,
  getFeedbackReport,
  getDepartmentReport,
  downloadAttendanceReport,
  downloadMarksReport
} from '../../api/analytics.api';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
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

  // Fetch departments for dropdown
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { data } = await getDepartments({ limit: 100 });
        if (data.success) setDepartments(data.data);
      } catch {}
    };
    fetchDepts();
  }, []);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

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
        setReportData(res.data.data);
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
      if (selectedDept) params.department = selectedDept;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

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

      // Trigger browser file download
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
    ];
  };

  return (
    <AdminLayout>
      <PageHeader title="System Reports" subtitle="Generate, preview, and download student training records" />

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 bg-dark-800/40 p-1 rounded-xl max-w-md">
        <button
          onClick={() => { setActiveTab('attendance'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeTab === 'attendance' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => { setActiveTab('marks'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeTab === 'marks' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Marks
        </button>
        <button
          onClick={() => { setActiveTab('feedback'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeTab === 'feedback' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Feedback
        </button>
        <button
          onClick={() => { setActiveTab('department'); setReportData([]); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold uppercase transition-all ${
            activeTab === 'department' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Department
        </button>
      </div>

      {/* Filters Area */}
      <div className="glass-card p-6 mb-6 flex flex-col md:flex-row gap-4 items-end">
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

      <DataTable
        columns={getColumns()}
        data={reportData}
        loading={loading}
        emptyMessage="No report data generated. Adjust filters and click Generate Preview."
      />
    </AdminLayout>
  );
}
