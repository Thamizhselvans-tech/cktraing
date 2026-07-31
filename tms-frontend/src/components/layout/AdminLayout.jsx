import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Building2, User, Users, Calendar,
  ClipboardCheck, MessageSquare, Award, BarChart3, Settings, LogOut,
  Menu, X, ChevronRight, GraduationCap, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboard } from '../../api/analytics.api';
import toast from 'react-hot-toast';

const sidebarVariants = {
  open:   { x: 0,    opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  closed: { x: '-100%', opacity: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsible Menu States
  const [openMenus, setOpenMenus] = useState({
    timetable: true, // open by default as in screenshot
    reports: false,
    feedback: false,
    marks: false,
  });

  // Ticking clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Statistics for Quick Summary
  const [stats, setStats] = useState({ students: 0, trainers: 0, departments: 0 });

  useEffect(() => {
    // Ticking clock effect
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch stats for Quick Summary
    const fetchStats = async () => {
      try {
        const { data } = await getDashboard();
        if (data.success) {
          setStats({
            students: data.data.totalStudents || 0,
            trainers: data.data.totalCoordinators || 0,
            departments: data.data.totalDepartments || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch sidebar stats', err);
      }
    };
    if (user) {
      fetchStats();
    }
  }, [user]);

  const toggleMenu = (menu) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  const renderFlatLink = (to, label, Icon) => {
    const isActive = location.pathname === to;
    return (
      <NavLink
        key={to}
        to={to}
        className={`sidebar-link group ${isActive ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white transition-colors'} />
        <span className="flex-1">{label}</span>
        {isActive && <ChevronRight size={14} className="opacity-70" />}
      </NavLink>
    );
  };

  const renderCollapsibleMenu = (key, label, Icon, sublinks) => {
    const isOpen = openMenus[key];
    const isAnySublinkActive = sublinks.some(
      (sub) =>
        location.pathname === sub.to &&
        (!sub.tab || new URLSearchParams(location.search).get('tab') === sub.tab)
    );

    return (
      <div key={key} className="space-y-1">
        <button
          onClick={() => toggleMenu(key)}
          className={`sidebar-link w-full text-left group flex items-center justify-between ${
            isAnySublinkActive ? 'text-white bg-white/5 font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon size={18} className={isAnySublinkActive ? 'text-white' : 'text-gray-500 group-hover:text-white transition-colors'} />
            <span>{label}</span>
          </div>
          <ChevronDown size={14} className={`transform transition-transform text-gray-500 group-hover:text-gray-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pl-7 space-y-1 border-l border-white/5 ml-5 mt-1"
            >
              {sublinks.map((sub) => {
                const searchStr = sub.tab ? `?tab=${sub.tab}` : '';
                const isActive =
                  location.pathname === sub.to &&
                  (!sub.tab || new URLSearchParams(location.search).get('tab') === sub.tab);
                return (
                  <NavLink
                    key={sub.to + searchStr}
                    to={sub.to + searchStr}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${
                      isActive
                        ? 'text-primary-400 bg-primary-500/10 font-bold shadow-glow-blue/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="w-1.5 h-1.5 rounded-sm bg-current opacity-60 flex-shrink-0" />
                    <span>{sub.label}</span>
                  </NavLink>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full min-h-0 bg-dark-900 border-r border-white/5 portal-sidebar overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <img src="/favicon.svg" alt="CKCET Logo" className="w-9 h-9 object-contain flex-shrink-0" />
        <div>
          <p className="font-display font-black text-white text-base leading-none tracking-wider">CKCET</p>
          <p className="text-[10px] text-blue-400 font-semibold mt-1 uppercase tracking-widest leading-none">Training Management System</p>
        </div>
      </div>

      {/* User Card */}
      <div className="px-3 pt-4">
        <div className="glass-card p-3 flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden font-display text-white text-xs font-bold">
                AD
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-dark-900 rounded-full" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-tight">{user?.name ?? 'Admin'}</p>
              <p className="text-gray-500 text-[10px] leading-tight mt-0.5">Super Administrator</p>
              <p className="text-emerald-500 text-[8px] font-medium leading-none flex items-center gap-1 mt-1">
                Online
              </p>
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-500" />
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 custom-sidebar-scroll">
        {renderFlatLink('/admin/dashboard', 'Dashboard', Home)}
        {renderFlatLink('/admin/departments', 'Department Management', Building2)}
        {renderFlatLink('/admin/coordinators', 'Trainer Management', User)}
        {renderFlatLink('/admin/students', 'Student Management', Users)}

        {renderCollapsibleMenu('timetable', 'Time Table Management', Calendar, [
          { to: '/admin/timetable', tab: 'internal', label: 'Internal Timetable' },
          { to: '/admin/timetable', tab: 'external', label: 'External Timetable' },
          { to: '/admin/timetable', tab: 'schedule', label: 'Admin Schedule' },
        ])}

        {renderCollapsibleMenu('reports', 'Attendance & Reports', ClipboardCheck, [
          { to: '/admin/reports', tab: 'attendance', label: 'Attendance Report' },
          { to: '/admin/reports', tab: 'marks', label: 'Marks Report' },
          { to: '/admin/reports', tab: 'feedback', label: 'Feedback Report' },
          { to: '/admin/reports', tab: 'department', label: 'Department Report' },
          { to: '/admin/reports', tab: 'send-principal', label: 'Send to Principal' },
        ])}

        {renderCollapsibleMenu('feedback', 'Feedback Management', MessageSquare, [
          { to: '/admin/reports', tab: 'feedback', label: 'Student Feedbacks' },
          { to: '/admin/audit-logs', label: 'Security Audit Logs' },
        ])}

        {renderCollapsibleMenu('marks', 'Marks / Test Reports', Award, [
          { to: '/admin/reports', tab: 'marks', label: 'Test Reports Overview' },
        ])}

        {renderFlatLink('/admin/analytics', 'Analytics & Insights', BarChart3)}
        {renderFlatLink('/admin/settings', 'System Settings', Settings)}

        {/* Quick Summary Widget */}
        <div className="mx-1 my-4 p-4 rounded-2xl bg-gradient-to-b from-blue-950/20 to-dark-800/40 border border-white/5 space-y-3">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Quick Summary</p>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users size={12} />
              </div>
              <span>Total Students</span>
            </div>
            <span className="font-semibold text-white">{stats.students}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
                <User size={12} />
              </div>
              <span>Total Trainers</span>
            </div>
            <span className="font-semibold text-white">{stats.trainers}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Building2 size={12} />
              </div>
              <span>Departments</span>
            </div>
            <span className="font-semibold text-white">{stats.departments}</span>
          </div>

          <hr className="border-white/5 my-2" />

          <div className="flex flex-col gap-0.5 text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Calendar size={12} />
              </div>
              <span>Today's Date</span>
            </div>
            <span className="font-semibold text-white pl-7 mt-0.5">
              {currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ClipboardCheck size={12} />
              </div>
              <span>Current Time</span>
            </div>
            <span className="font-semibold text-white pl-7 mt-0.5 font-mono">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
      </nav>

      {/* Logout button at very bottom */}
      <div className="flex-shrink-0 px-3 py-4 border-t border-white/5 bg-dark-900/90">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <GraduationCap size={15} className="text-white" />
              </div>
              <span className="text-white font-display font-semibold text-sm">TMS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-none">{user?.name ?? 'Administrator'}</p>
              <p className="text-gray-500 text-xs mt-0.5">Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold font-display">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2 !px-3 !py-2 text-sm text-rose-400 hover:text-rose-300"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-dark-950">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
