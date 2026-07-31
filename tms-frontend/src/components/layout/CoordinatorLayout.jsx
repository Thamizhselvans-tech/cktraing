import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Users, Calendar,
  LogOut, Menu, X, ChevronRight, GraduationCap, Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV_LINKS = [
  { to: '/coordinator/dashboard',          label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/coordinator/attendance',         label: 'Attendance',       icon: ClipboardCheck },
  { to: '/coordinator/marks',              label: 'Marks Entry',      icon: BookOpen },
  { to: '/coordinator/students',           label: 'Student List',     icon: Users },
  { to: '/coordinator/schedule',           label: 'Training Schedule',icon: Calendar },
  { to: '/coordinator/change-password',    label: 'Change Password',  icon: Settings },
];

const sidebarVariants = {
  open:   { x: 0,    opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  closed: { x: '-100%', opacity: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export default function CoordinatorLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    toast.success('Logged out successfully');
    await logout();
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full min-h-0 bg-dark-900 border-r border-white/5 portal-sidebar overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <img src="/favicon.svg" alt="CKCET Logo" className="w-9 h-9 object-contain flex-shrink-0" />
        <div>
          <p className="font-display font-black text-white text-base leading-none tracking-wider">CKCET</p>
          <p className="text-[10px] text-emerald-400 font-semibold mt-1 uppercase tracking-widest">Coordinator</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 custom-sidebar-scroll">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link group ${isActive ? 'active' : ''}`
            }
            onClick={() => setMobileOpen(false)}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white transition-colors'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Card */}
      <div className="flex-shrink-0 px-3 py-4 border-t border-white/10 bg-dark-900/90">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'C'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name ?? 'Coordinator'}</p>
            <p className="text-gray-500 text-[10px] truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-icon text-gray-400 hover:text-rose-400"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900 coordinator-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-full min-h-0 flex-shrink-0 bg-dark-800/80 backdrop-blur-md border-r border-white/10 overflow-hidden">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 h-full w-72 bg-dark-800 border-r border-white/10 z-50 flex flex-col lg:hidden"
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <button
                className="absolute top-4 right-4 btn-icon text-gray-400"
                onClick={() => setMobileOpen(false)}
              >
                <X size={20} />
              </button>
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden portal-body-light">
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-dark-800/60 backdrop-blur-md border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden btn-icon text-gray-400"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                <GraduationCap size={15} className="text-white" />
              </div>
              <span className="text-white font-display font-semibold text-sm">TMS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-none">{user?.name ?? 'Coordinator'}</p>
              <p className="text-gray-500 text-xs mt-0.5">Coordinator</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'C'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2 !px-3 !py-2 text-sm"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
