import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ShieldAlert, KeyRound, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminLogin } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      return toast.error('Please enter both username and password.');
    }
    setLoading(true);
    const toastId = toast.loading('Connecting to server...');
    try {
      const { data } = await adminLogin({ username, password });
      toast.dismiss(toastId);
      if (data.success) {
        login(data.data);
        toast.success(data.message || 'Login successful!');
        navigate('/admin/dashboard');
      } else {
        toast.error(data.message || 'Invalid credentials');
      }
    } catch (err) {
      toast.dismiss(toastId);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        toast.error('Server is taking time to wake up. Please click login again!');
      } else {
        toast.error(err.response?.data?.message || 'Login failed. Please check network/credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-900 overflow-hidden relative">
      {/* Glow Blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Left side decorative (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-dark-800/40 p-12 border-r border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="CKCET Logo" className="w-10 h-10 object-contain" />
          <span className="font-display font-black text-2xl text-white tracking-wider">CKCET</span>
        </div>
        <div className="my-auto max-w-lg">
          <h2 className="text-4xl font-display font-black text-white leading-tight">
            Centralized College Training <span className="text-gradient-blue">Administration</span>
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed text-sm">
            Access settings, upload student lists, review feedback, manage schedules, and compile automated training reports from a secure environment.
          </p>
        </div>
        <div className="text-xs text-gray-600">
          SECURE ENCRYPTED GATEWAY. UNAUTHORIZED ACCESS PROHIBITED.
        </div>
      </div>

      {/* Right side login form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 z-10">
        <motion.div
          className="glass-card w-full max-w-md p-8 relative overflow-hidden"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mb-4 shadow-glow-blue">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-2xl font-display font-bold text-white">Admin Login</h3>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Training Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="input-group">
              <label htmlFor="admin-username" className="input-label">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="input-field pl-10"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="admin-password" className="input-label">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                  <KeyRound size={16} />
                </span>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="input-field pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>

          {/* Quick links to alternate portals */}
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between text-xs">
            <Link to="/coordinator/login" className="text-gray-500 hover:text-emerald-400 transition-colors">
              Coordinator Login
            </Link>
            <Link to="/student/login" className="text-gray-500 hover:text-purple-400 transition-colors">
              Student Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
