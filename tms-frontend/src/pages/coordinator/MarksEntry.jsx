import { useState, useEffect, useCallback } from 'react';
import CoordinatorLayout from '../../components/layout/CoordinatorLayout';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByDept } from '../../api/students.api';
import { getDepartmentMarks, createOrUpdateMarks } from '../../api/marks.api';
import { BookOpen, Check, ShieldCheck, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MarksEntry() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [marksMap, setMarksMap] = useState({}); // { [studentId]: marksRecord }

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [mockTest, setMockTest] = useState(0);
  const [aptitude, setAptitude] = useState(0);
  const [technical, setTechnical] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchMarksSheet = useCallback(async () => {
    if (!user?.department?._id) return;
    setLoading(true);
    try {
      // 1. Get all students
      const studRes = await getStudentsByDept(user.department._id, { search, limit: 100 });
      let studentList = [];
      if (studRes.data.success) {
        studentList = studRes.data.data;
        setStudents(studentList);
      }

      // 2. Get department marks
      const marksRes = await getDepartmentMarks(user.department._id, { limit: 100 });
      const records = marksRes.data.data;

      const map = {};
      records.forEach((r) => {
        map[r.student?._id] = r;
      });
      setMarksMap(map);
    } catch {
      toast.error('Failed to load marks worksheet');
    } finally {
      setLoading(false);
    }
  }, [user, search]);

  useEffect(() => {
    fetchMarksSheet();
  }, [fetchMarksSheet]);

  const handleOpenEdit = (student) => {
    const record = marksMap[student._id];
    setSelectedStudent(student);
    setMockTest(record?.mockTest ?? 0);
    setAptitude(record?.aptitude ?? 0);
    setTechnical(record?.technical ?? 0);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (mockTest < 0 || mockTest > 100 || aptitude < 0 || aptitude > 100 || technical < 0 || technical > 100) {
      return toast.error('Marks must be between 0 and 100');
    }

    setSaving(true);
    try {
      const res = await createOrUpdateMarks({
        student: selectedStudent._id,
        department: user.department._id,
        mockTest: Number(mockTest),
        aptitude: Number(aptitude),
        technical: Number(technical),
      });

      if (res.data.success) {
        toast.success('Marks recorded successfully');
        setModalOpen(false);
        fetchMarksSheet();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = () => Number(mockTest) + Number(aptitude) + Number(technical);
  const calculateAverage = () => (calculateTotal() / 3).toFixed(2);

  return (
    <CoordinatorLayout>
      <PageHeader title="Marks Entry Sheets" subtitle="Record Mock, Aptitude, and Technical assessments scores" />

      <div className="mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search student name/reg number..." />
      </div>

      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Register No</th>
              <th>Student Name</th>
              <th className="text-center">Mock Test</th>
              <th className="text-center">Aptitude</th>
              <th className="text-center">Technical</th>
              <th className="text-center">Total</th>
              <th className="text-center">Average</th>
              <th className="text-center">Status</th>
              <th className="w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  <td><div className="skeleton h-4 w-24" /></td>
                  <td><div className="skeleton h-4 w-40" /></td>
                  <td className="text-center"><div className="skeleton h-4 w-10 mx-auto" /></td>
                  <td className="text-center"><div className="skeleton h-4 w-10 mx-auto" /></td>
                  <td className="text-center"><div className="skeleton h-4 w-10 mx-auto" /></td>
                  <td className="text-center"><div className="skeleton h-4 w-10 mx-auto" /></td>
                  <td className="text-center"><div className="skeleton h-4 w-10 mx-auto" /></td>
                  <td className="text-center"><div className="skeleton h-6 w-20 mx-auto" /></td>
                  <td className="text-right"><div className="skeleton h-6 w-12 ml-auto" /></td>
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">No students registered.</td>
              </tr>
            ) : (
              students.map((student) => {
                const record = marksMap[student._id];
                return (
                  <tr key={student._id}>
                    <td className="font-bold text-white">{student.registerNumber}</td>
                    <td>{student.name}</td>
                    <td className="text-center">{record?.mockTest ?? '-'}</td>
                    <td className="text-center">{record?.aptitude ?? '-'}</td>
                    <td className="text-center">{record?.technical ?? '-'}</td>
                    <td className="text-center font-bold">{record?.total ?? '-'}</td>
                    <td className="text-center font-bold text-primary-400">{record?.average ?? '-'}</td>
                    <td className="text-center">
                      {record ? (
                        record.isVerified ? (
                          <span className="badge-emerald inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                            <ShieldCheck size={12} /> Verified
                          </span>
                        ) : (
                          <span className="badge bg-amber-500/20 text-amber-400 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                            Pending Verification
                          </span>
                        )
                      ) : (
                        <span className="badge bg-gray-500/20 text-gray-400 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                          Not Entered
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleOpenEdit(student)}
                        disabled={record?.isVerified}
                        className="btn-icon text-blue-400 hover:bg-blue-500/10 disabled:opacity-20 disabled:pointer-events-none"
                        title={record?.isVerified ? 'Locked (Verified)' : 'Enter Marks'}
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Marks Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Enter Marks: ${selectedStudent?.name || ''}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="input-group">
              <label className="input-label">Mock Test</label>
              <input
                type="number"
                min="0"
                max="100"
                value={mockTest}
                onChange={(e) => setMockTest(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Aptitude</label>
              <input
                type="number"
                min="0"
                max="100"
                value={aptitude}
                onChange={(e) => setAptitude(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Technical</label>
              <input
                type="number"
                min="0"
                max="100"
                value={technical}
                onChange={(e) => setTechnical(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-dark-800/40 p-4 rounded-xl border border-white/5 mt-4">
            <div>
              <p className="text-xs text-gray-400 uppercase">Calculated Total</p>
              <p className="text-lg font-bold text-white">{calculateTotal()} / 300</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Average Percentage</p>
              <p className="text-lg font-bold text-primary-400">{calculateAverage()}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-white/5">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Check size={16} />
              <span>{saving ? 'Saving...' : 'Save Marks'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </CoordinatorLayout>
  );
}
