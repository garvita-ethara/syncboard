import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import InlineMessage from '../components/InlineMessage';
import { useToast } from '../components/ui';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

export default function Profile() {
  const api = useApi();
  const { user, reloadUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [presence, setPresence] = useState(user?.presence || 'ACTIVE');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/users/me/profile');
      setProfile(data);
      setPresence(data.user.presence || 'ACTIVE');
      setDisplayName(data.user.name || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    try {
      setSaving(true);
      await api.patch('/users/me', { name: displayName });
      await api.patch('/users/me/presence', { presence });
      await reloadUser();
      setSuccess('Profile updated successfully.');
      toast?.pushToast({ type: 'success', title: 'Profile updated', message: 'Your profile details were saved.' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }

    try {
      setSaving(true);
      await api.patch('/users/me/password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password updated successfully.');
      toast?.pushToast({ type: 'success', title: 'Password updated', message: 'Your account password has been changed.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  if (error && !profile && !loading) return <ErrorCard title="Unable to load profile" message={error} onRetry={load} />;
  if (loading || !profile) return <StateSkeleton title="Profile" kind="cards" />;

  return (
    <section>
      <PageHeader title="Profile" description="Account details, role, and availability status." />
      <InlineMessage kind="error">{error}</InlineMessage>
      <InlineMessage kind="success">{success}</InlineMessage>

      <div className="profile-grid">
        <div className="panel">
          <div className="panel-heading"><h2>Profile Details</h2></div>
          <form className="stack" onSubmit={saveProfile}>
            <label>Display Name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
            <label>Email<input value={profile.user.email} disabled /></label>
            <label>Role<input value={profile.user.role} disabled /></label>
            <label>Initials<input value={profile.user.avatarInitials || ''} disabled /></label>
            <label>Presence
              <select value={presence} onChange={(e) => setPresence(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="IDLE">Idle</option>
                <option value="AWAY">Away</option>
                <option value="DND">Do Not Disturb</option>
              </select>
            </label>
            <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-heading"><h2>Work Summary</h2></div>
          <div className="stats-inline">
            <div className="mini-stat"><span>Assigned projects</span><strong>{profile.stats.assignedProjects || 0}</strong></div>
            <div className="mini-stat"><span>Assigned tasks</span><strong>{profile.stats.assignedTasks || 0}</strong></div>
            <div className="mini-stat"><span>Completed tasks</span><strong>{profile.stats.completedTasks || 0}</strong></div>
            <div className="mini-stat"><span>Joined</span><strong>{new Date(profile.user.createdAt).toLocaleDateString()}</strong></div>
            <div className="mini-stat"><span>Last active</span><strong>{profile.user.lastActive ? new Date(profile.user.lastActive).toLocaleString() : '-'}</strong></div>
            <div className="mini-stat"><span>Current presence</span><strong>{profile.user.presence || 'AWAY'}</strong></div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading"><h2>Change Password</h2></div>
        <form className="task-filters-grid" onSubmit={updatePassword}>
          <label>
            Current password
            <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} />
          </label>
          <label>
            New password
            <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
          </label>
          <label>
            Confirm new password
            <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
          </label>
          <div>
            <button className="primary" type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
