import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import { changePassword } from '../../api/auth.api';
import { KeyRound, ShieldAlert, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('Please enter all fields');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }

    setSaving(true);
    try {
      const { data } = await changePassword({ currentPassword, newPassword });
      if (data.success) {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="System Settings" subtitle="Configure system preferences and account settings" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Password Form */}
        <div className="glass-card p-6">
          <h3 className="text-white text-base font-bold mb-4 font-display flex items-center gap-2">
            <KeyRound className="text-primary-400" size={18} />
            <span>Update Account Password</span>
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="input-group">
              <label className="input-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="input-field"
                required
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* System info */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-white text-base font-bold mb-4 font-display flex items-center gap-2">
              <ShieldAlert className="text-amber-400" size={18} />
              <span>System & Environment Information</span>
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Application Version</span>
                <span className="text-white font-semibold">1.0.0 (Production Build)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Database Engine</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check size={14} /> Connected
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Client Engine</span>
                <span className="text-white">React 18.2 (Vite)</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-400">Server Instance</span>
                <span className="text-white">Express API</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-500 mt-6 leading-relaxed">
            * Security note: Session tokens are stored using HttpOnly Secure cookies to prevent Cross-Site Scripting (XSS) hijacking. Passwords are salted and hashed using bcrypt at 12 rounds.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
