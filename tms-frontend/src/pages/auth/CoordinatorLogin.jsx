import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, UserCheck, KeyRound, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { coordinatorLogin } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function CoordinatorLogin() {
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
      const { data } = await coordinatorLogin({ username, password });
      toast.dismiss(toastId);
      if (data.success) {
        login(data.data);
        toast.success(data.message || 'Login successful!');
        if (data.data.mustChangePassword) {
          navigate('/coordinator/change-password');
        } else {
          navigate('/coordinator/dashboard');
        }
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
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      {/* Left side decorative (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-dark-800/40 p-12 border-r border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-glow-emerald">
            <GraduationCap className="text-white" size={20} />
          </div>
          <span className="font-display font-black text-xl text-white">TMS</span>
        </div>
        <div className="my-auto max-w-lg">
          <h2 className="text-4xl font-display font-black text-white leading-tight">
            Department Coordinator <span className="text-gradient-emerald">Workspace</span>
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed text-sm">
            Access your department's attendance records, manage student lists, enter mock test marks, and track external training schedules.
          </p>
        </div>
        <div className="text-xs text-gray-600">
          DEPARTMENT COORDINATOR SECURITY ENVELOPE.
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white mb-4 shadow-glow-emerald">
              <UserCheck size={24} />
            </div>
            <h3 className="text-2xl font-display font-bold text-white">Coordinator Login</h3>
            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Training Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="input-group">
              <label className="input-label">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter coordinator username"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                  <KeyRound size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter coordinator password"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-success w-full mt-2"
            >
              {loading ? 'Authenticating...' : 'Coordinator Login'}
            </button>
          </form>

          {/* Quick links to alternate portals */}
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between text-xs">
            <Link to="/admin/login" className="text-gray-500 hover:text-blue-400 transition-colors">
              Admin Login
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
