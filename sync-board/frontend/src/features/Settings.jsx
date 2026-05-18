import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import InlineMessage from '../components/InlineMessage';
import StateSkeleton from '../components/StateSkeleton';
import { navigate } from '../utils/router';
import { useToast } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

const accents = [
  { name: 'Blue', value: '#346dff' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Slate', value: '#64748b' }
];

export default function Settings({
  theme,
  resolvedTheme,
  setTheme,
  density,
  setDensity,
  accent,
  setAccent,
  onLogout
}) {
  const api = useApi();
  const { reloadUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/users/me/profile');
        if (!mounted) return;
        setProfile(data.user);
        setDisplayName(data.user.name || '');
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [api]);

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    try {
      setSavingProfile(true);
      await api.patch('/users/me', { name: displayName.trim() });
      await reloadUser();
      setSuccess('Profile details updated.');
      toast?.pushToast({ type: 'success', title: 'Profile updated', message: 'Your name was saved.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
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
      setSavingPassword(true);
      await api.patch('/users/me/password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password updated successfully.');
      toast?.pushToast({ type: 'success', title: 'Password updated', message: 'Your account is now secured with the new password.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <StateSkeleton title="Settings" kind="cards" />;

  return (
    <section className="content-shell">
      <div className="content-container settings-shell">
        <PageHeader title="Settings" description="Workspace preferences, account controls, and security in one place." />
        <InlineMessage kind="error">{error}</InlineMessage>
        <InlineMessage kind="success">{success}</InlineMessage>

        <div className="panel settings-panel" id="appearance-settings">
          <div className="panel-heading"><h2>Appearance</h2></div>
          <p className="muted">Choose your preferred interface theme. Changes apply instantly across the workspace.</p>
          <div className="settings-segmented">
            <button className={theme === 'light' ? 'primary' : 'ghost'} type="button" onClick={() => { setTheme('light'); toast?.pushToast({ type: 'success', title: 'Appearance', message: 'Light mode enabled.' }); }}>Light mode</button>
            <button className={theme === 'dark' ? 'primary' : 'ghost'} type="button" onClick={() => { setTheme('dark'); toast?.pushToast({ type: 'success', title: 'Appearance', message: 'Dark mode enabled.' }); }}>Dark mode</button>
            <button className={theme === 'system' ? 'primary' : 'ghost'} type="button" onClick={() => { setTheme('system'); toast?.pushToast({ type: 'success', title: 'Appearance', message: `System mode enabled (${resolvedTheme}).` }); }}>System mode</button>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>Active theme: <strong>{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</strong></p>
        </div>

        <div className="panel settings-panel" id="customization-settings">
          <div className="panel-heading"><h2>Customization</h2></div>
          <p className="muted">Adjust accent and spacing density for your preferred working style.</p>

          <div className="settings-group">
            <span className="settings-label">Accent color</span>
            <div className="accent-grid">
              {accents.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`accent-swatch ${accent === item.value ? 'active' : ''}`}
                  onClick={() => {
                    setAccent(item.value);
                    toast?.pushToast({ type: 'info', title: 'Customization', message: `Accent switched to ${item.name}.` });
                  }}
                  aria-label={`Set accent to ${item.name}`}
                  title={item.name}
                >
                  <span style={{ background: item.value }} />
                  <b>{item.name}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <span className="settings-label">Layout density</span>
            <div className="settings-segmented">
              <button className={density === 'comfortable' ? 'primary' : 'ghost'} type="button" onClick={() => { setDensity('comfortable'); toast?.pushToast({ type: 'success', title: 'Layout', message: 'Comfortable layout applied.' }); }}>Comfortable</button>
              <button className={density === 'compact' ? 'primary' : 'ghost'} type="button" onClick={() => { setDensity('compact'); toast?.pushToast({ type: 'success', title: 'Layout', message: 'Compact layout applied.' }); }}>Compact</button>
            </div>
          </div>
        </div>

        <div className="profile-grid settings-profile-grid" id="account-settings">
          <div className="panel settings-panel">
            <div className="panel-heading"><h2>Profile Details</h2></div>
            <form className="stack" onSubmit={saveProfile}>
              <label>Display name<input className="ui-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
              <label>Email<input className="ui-input" value={profile?.email || ''} disabled /></label>
              <label>Role<input className="ui-input" value={profile?.role || ''} disabled /></label>
              <label>Status<input className="ui-input" value={String(profile?.presence || 'ACTIVE')} disabled /></label>
              <button className="primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</button>
            </form>
          </div>

          <div className="panel settings-panel">
            <div className="panel-heading"><h2>Change Password</h2></div>
            <form className="stack" onSubmit={savePassword}>
              <label>Current password
                <input className="ui-input" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} />
              </label>
              <label>New password
                <input className="ui-input" type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} />
              </label>
              <label>Confirm new password
                <input className="ui-input" type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} />
              </label>
              <button className="primary" type="submit" disabled={savingPassword}>{savingPassword ? 'Updating...' : 'Update password'}</button>
            </form>
          </div>
        </div>

        <div className="panel settings-panel" id="preferences-settings">
          <div className="panel-heading"><h2>Preferences</h2></div>
          <p className="muted">
            Presence is managed from the sidebar profile menu. Preferences are saved locally and restored after refresh.
          </p>
          <div className="split-actions">
            <button className="ghost" type="button" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
            <button className="ghost logout-btn" type="button" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </section>
  );
}
