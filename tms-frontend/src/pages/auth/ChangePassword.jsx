import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('Please fill in all password fields.');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New password and confirm password do not match.');
    }

    setLoading(true);
    try {
      const { data } = await changePassword({ currentPassword, newPassword });
      if (data.success) {
        toast.success('Password changed successfully!');
        updateUser({ mustChangePassword: false });

        // Redirect based on role
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'coordinator') {
          navigate('/coordinator/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-dark-900 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl" />
      <motion.div
        className="glass-card w-full max-w-md p-8 relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 shadow-glow-amber">
            <ShieldAlert size={24} />
          </div>
          <h3 className="text-xl font-display font-bold text-white">Change Password Required</h3>
          <p className="text-gray-400 text-xs mt-2 max-w-xs leading-relaxed">
            For security reasons, you must change your initial temporary password before continuing to your portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label className="input-label">Current Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                <KeyRound size={16} />
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                <KeyRound size={16} />
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirm New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
                <Check size={16} />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            {loading ? 'Updating Password...' : 'Update Password & Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
