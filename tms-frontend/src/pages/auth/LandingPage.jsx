import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldAlert, UserCheck, Users } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Admin Portal',
      description: 'System settings, user management, scheduling, reports and analytics.',
      icon: ShieldAlert,
      path: '/admin/login',
      color: 'from-blue-500 to-purple-600',
      shadow: 'shadow-glow-blue',
    },
    {
      title: 'Coordinator Portal',
      description: 'Manage attendance marking, enter marks, and view schedules for your department.',
      icon: UserCheck,
      path: '/coordinator/login',
      color: 'from-emerald-500 to-cyan-600',
      shadow: 'shadow-glow-emerald',
    },
    {
      title: 'Student Portal',
      description: 'View training timetables, check marks, track attendance, and submit feedback.',
      icon: Users,
      path: '/student/login',
      color: 'from-purple-500 to-rose-600',
      shadow: 'shadow-glow-purple',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <motion.div
        className="text-center z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue">
            <GraduationCap className="text-white" size={18} />
          </div>
          <span className="text-white font-display font-bold">TMS</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-black text-white tracking-tight">
          Training Management <span className="text-gradient-blue">System</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-sm sm:text-base text-gray-400">
          Fully digital college training coordination. Elevate attendance, mark sheets, and timetables.
        </p>
      </motion.div>

      {/* Main Portals Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 my-12 z-10 w-full">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              className="glass-card-hover flex flex-col justify-between p-6 cursor-pointer group"
              onClick={() => navigate(card.path)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.15 }}
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform ${card.shadow}`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-display font-bold text-white group-hover:text-primary-400 transition-colors">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                  {card.description}
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4">
                <button className="btn-primary w-full flex items-center justify-center gap-2">
                  Access Portal
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 z-10">
        <p>© 2026 Training Management System (TMS). All rights reserved.</p>
      </div>
    </div>
  );
}
