import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import ReadOnlyField from './ReadOnlyField';
import InlineMessage from './InlineMessage';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from './ui';

export default function ProfileEditModal({ open, onClose, onLogout }) {
  const api = useApi();
  const { user, reloadUser } = useAuth();
  const toast = useToast();
  const [displayName, setDisplayName] = useState('');
  const [presence, setPresence] = useState('ACTIVE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/users/me/profile');
        if (!mounted) return;
        setDisplayName(data.user.name || '');
        setPresence(data.user.presence || 'ACTIVE');
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [api, open, user]);

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/users/me', { name: displayName.trim() });
      await api.patch('/users/me/presence', { presence });
      await reloadUser();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('presence:changed', {
          detail: { userId: user.id, presence }
        }));
      }
      toast?.pushToast({ type: 'success', title: 'Saved', message: 'Profile updated.' });
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Modal open={open} title="Profile" onClose={onClose}>
      <InlineMessage kind="error">{error}</InlineMessage>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form className="modal-form minimal-form" onSubmit={saveProfile}>
          <ReadOnlyField label="Email" value={user.email} />
          <ReadOnlyField label="Role" value={user.role} />
          <label>
            Name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
          </label>
          <label>
            Status
            <select value={presence} onChange={(e) => setPresence(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="IDLE">Idle</option>
              <option value="AWAY">Away</option>
              <option value="DND">Do not disturb</option>
            </select>
          </label>
          <div className="modal-actions minimal-form-actions">
            <button className="ghost" type="button" onClick={() => { onClose?.(); onLogout?.(); }}>Logout</button>
            <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
