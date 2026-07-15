import StudentLayout from '../../components/layout/StudentLayout';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, GraduationCap, Award, IdCard } from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAuth();

  return (
    <StudentLayout>
      <PageHeader title="My Profile" subtitle="Verify your academic details and training parameters" />

      <div className="max-w-3xl">
        <div className="glass-card overflow-hidden">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-blue relative" />

          {/* Profile Details Container */}
          <div className="relative px-6 pb-8">
            {/* Avatar Circle */}
            <div className="absolute -top-12 left-6 w-24 h-24 rounded-full border-4 border-dark-900 bg-gradient-to-br from-purple-500 to-rose-600 flex items-center justify-center text-white text-3xl font-bold shadow-glow-purple">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'S'}
            </div>

            {/* Title */}
            <div className="pt-16">
              <h3 className="text-xl font-display font-bold text-white">{user?.name}</h3>
              <p className="text-xs text-gray-500 mt-1">Student, Department of {user?.department?.name || '-'}</p>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 border-t border-white/5 pt-6 text-sm">
              <div className="flex items-center gap-3 bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <IdCard size={20} className="text-primary-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Register Number</p>
                  <p className="text-white font-medium mt-0.5">{user?.registerNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <GraduationCap size={20} className="text-emerald-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Department Code</p>
                  <p className="text-white font-medium mt-0.5">{user?.department?.code}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <Mail size={20} className="text-purple-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Email Address</p>
                  <p className="text-white font-medium mt-0.5">{user?.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <Phone size={20} className="text-amber-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Mobile Number</p>
                  <p className="text-white font-medium mt-0.5">{user?.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-dark-800/40 p-4 rounded-xl border border-white/5">
                <Award size={20} className="text-cyan-400" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Year / Batch</p>
                  <p className="text-white font-medium mt-0.5">
                    {user?.year ? `${user.year} Year` : '-'} {user?.batch ? `(${user.batch})` : ''}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 text-center mt-8 leading-relaxed">
              * Note: Contact your Department Coordinator or Placement Coordinator if there is any error in your profile details.
            </p>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
