import { useState, useEffect, useCallback } from 'react';
import CoordinatorLayout from '../../components/layout/CoordinatorLayout';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByDept } from '../../api/students.api';
import { getDepartmentAttendance, bulkMarkAttendance } from '../../api/attendance.api';
import { Check, X, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendanceMarking() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local Attendance State: { [studentId]: { morningSession: bool, afternoonSession: bool, id?: string, isLocked?: boolean } }
  const [attendanceState, setAttendanceState] = useState({});

  const fetchAttendanceData = useCallback(async () => {
    if (!user?.department?._id) return;
    setLoading(true);
    try {
      // 1. Fetch all active students in department
      const studentsRes = await getStudentsByDept(user.department._id, { limit: 100 });
      let studentList = [];
      if (studentsRes.data.success) {
        studentList = studentsRes.data.data;
        setStudents(studentList);
      }

      // 2. Fetch existing attendance for this date
      const attendanceRes = await getDepartmentAttendance(user.department._id, { date });
      const attendanceRecords = attendanceRes.data.data;

      // 3. Map to state
      const initialMap = {};
      // Populate defaults (absent)
      studentList.forEach((s) => {
        initialMap[s._id] = {
          morningSession: false,
          afternoonSession: false,
          isLocked: false,
        };
      });

      // Overlay existing records
      attendanceRecords.forEach((r) => {
        if (initialMap[r.student?._id]) {
          initialMap[r.student._id] = {
            id: r._id,
            morningSession: r.morningSession,
            afternoonSession: r.afternoonSession,
            isLocked: r.isLocked,
          };
        }
      });

      setAttendanceState(initialMap);
    } catch {
      toast.error('Failed to load attendance sheet');
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const handleToggle = (studentId, session) => {
    const isTodaySelected = date === new Date().toISOString().split('T')[0];
    const isRecordLocked = attendanceState[studentId]?.isLocked;

    if (!isTodaySelected) {
      return toast.error('Coordinators can only edit same-day attendance.');
    }
    if (isRecordLocked) {
      return toast.error('This record has been locked by Admin.');
    }

    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [session]: !prev[studentId][session],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadData = Object.keys(attendanceState).map((studentId) => ({
        student: studentId,
        morningSession: attendanceState[studentId].morningSession,
        afternoonSession: attendanceState[studentId].afternoonSession,
      }));

      const res = await bulkMarkAttendance({
        department: user.department._id,
        date,
        attendanceData: payloadData,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Attendance saved successfully!');
        fetchAttendanceData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getPercentage = (studentId) => {
    const state = attendanceState[studentId];
    if (!state) return 0;
    if (state.morningSession && state.afternoonSession) return 100;
    if (state.morningSession || state.afternoonSession) return 50;
    return 0;
  };

  const isTodaySelected = date === new Date().toISOString().split('T')[0];

  return (
    <CoordinatorLayout>
      <PageHeader
        title="Attendance Marking"
        subtitle="Mark morning and afternoon training presence for students"
        actions={
          <button
            onClick={handleSave}
            disabled={saving || !isTodaySelected || students.length === 0}
            className="btn-success flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Check size={16} />
            <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        }
      />

      {/* Date filter & warning alert */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-center">
        <div className="input-group">
          <label className="input-label">Attendance Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // Block future dates
            className="input-field"
          />
        </div>

        {!isTodaySelected && (
          <div className="md:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 mt-5">
            <ShieldAlert className="text-amber-500 flex-shrink-0" size={20} />
            <p className="text-xs text-amber-300">
              Editing is locked. Same-day attendance can only be entered/edited on the actual calendar date. Contact Admin to make past adjustments.
            </p>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-32">Register No</th>
              <th>Student Name</th>
              <th className="w-32 text-center">Morning</th>
              <th className="w-32 text-center">Afternoon</th>
              <th className="w-32 text-center">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  <td className="py-4"><div className="skeleton h-4 w-20" /></td>
                  <td className="py-4"><div className="skeleton h-4 w-40" /></td>
                  <td className="py-4 text-center"><div className="skeleton h-6 w-12 mx-auto" /></td>
                  <td className="py-4 text-center"><div className="skeleton h-6 w-12 mx-auto" /></td>
                  <td className="py-4 text-center"><div className="skeleton h-4 w-12 mx-auto" /></td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No students registered in your department.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const state = attendanceState[student._id] || { morningSession: false, afternoonSession: false };
                const pct = getPercentage(student._id);

                return (
                  <tr key={student._id}>
                    <td className="font-bold text-white">{student.registerNumber}</td>
                    <td>{student.name}</td>
                    <td className="text-center">
                      <button
                        onClick={() => handleToggle(student._id, 'morningSession')}
                        disabled={!isTodaySelected || state.isLocked}
                        className={`mx-auto w-16 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                          state.morningSession
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {state.morningSession ? <Check size={14} /> : <X size={14} />}
                      </button>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleToggle(student._id, 'afternoonSession')}
                        disabled={!isTodaySelected || state.isLocked}
                        className={`mx-auto w-16 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                          state.afternoonSession
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {state.afternoonSession ? <Check size={14} /> : <X size={14} />}
                      </button>
                    </td>
                    <td className="text-center font-bold">
                      <span className={pct === 100 ? 'text-emerald-400' : pct === 50 ? 'text-amber-400' : 'text-rose-400'}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </CoordinatorLayout>
  );
}
