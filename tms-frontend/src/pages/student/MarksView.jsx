import { useState, useEffect } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { getStudentMarks } from '../../api/marks.api';
import { Award, BookOpen, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function MarksView() {
  const { user } = useAuth();
  const [marks, setMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchMarks = async () => {
      if (!user?._id) return;
      setLoading(true);
      try {
        const { data } = await getStudentMarks(user._id);
        if (data.success) {
          setMarks(data.data);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, [user]);

  if (loading) return <Loader />;

  if (notFound) {
    return (
      <StudentLayout>
        <PageHeader title="My Performance Scores" subtitle="Placement training assessment grades sheet" />
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-12 border border-amber-500/20 bg-amber-500/5">
          <AlertCircle size={40} className="text-amber-500 mb-4" />
          <h4 className="text-lg font-bold text-white mb-2">No Marks Recorded Yet</h4>
          <p className="text-gray-400 text-sm">
            Your department coordinator has not entered your test scores. Please check back later or contact your department coordinator.
          </p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader title="My Performance Scores" subtitle="Placement training assessment grades sheet" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {/* Large Summary Card */}
        <div className="glass-card p-6 md:col-span-2 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl" />

          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Award className="text-primary-400" size={20} />
                <h3 className="text-base font-bold text-white font-display">Training Marks Summary</h3>
              </div>
              <Badge
                text={marks?.isVerified ? 'Verified by Admin' : 'Pending Verification'}
                type={marks?.isVerified ? 'success' : 'warning'}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 font-semibold uppercase">Mock Test</p>
                <p className="text-2xl font-bold text-white mt-1">{marks?.mockTest ?? 0}</p>
                <span className="text-[10px] text-gray-600">Max 100</span>
              </div>
              <div className="bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 font-semibold uppercase">Aptitude</p>
                <p className="text-2xl font-bold text-white mt-1">{marks?.aptitude ?? 0}</p>
                <span className="text-[10px] text-gray-600">Max 100</span>
              </div>
              <div className="bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 font-semibold uppercase">Technical</p>
                <p className="text-2xl font-bold text-white mt-1">{marks?.technical ?? 0}</p>
                <span className="text-[10px] text-gray-600">Max 100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-emerald-400" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Aggregate</p>
                <p className="text-lg font-bold text-white mt-0.5">{marks?.total} / 300</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award size={20} className="text-primary-400" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Average Percentage</p>
                <p className="text-lg font-bold text-primary-400 mt-0.5">{marks?.average}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informative Side Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Grades Lock Status</span>
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your grades are currently managed by your department coordinator. Once verified by the Admin, scores will become permanently locked.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Marks Status</span>
                <span className={marks?.isVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {marks?.isVerified ? 'LOCKED' : 'EDITABLE BY STAFF'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-500">Grading Officer</span>
                <span className="text-white">{marks?.enteredBy?.name || 'Coordinator'}</span>
              </div>
              {marks?.isVerified && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Verification Date</span>
                  <span className="text-white">{new Date(marks.verifiedAt).toLocaleDateString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-[9px] text-gray-600 mt-6 leading-relaxed">
            * Note: For correction inquiries, contact your respective department coordinator before verification.
          </p>
        </div>
      </div>
    </StudentLayout>
  );
}
