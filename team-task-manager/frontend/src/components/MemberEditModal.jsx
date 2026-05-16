import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import InlineMessage from './InlineMessage';
import { useApi } from '../hooks/useApi';
import { useToast } from './ui';

const defaultForm = {
  name: '',
  email: '',
  role: 'MEMBER',
  isActive: true
};

export default function MemberEditModal({ open, member, onClose, onSaved }) {
  const api = useApi();
  const toast = useToast();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setForm({
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'MEMBER',
      isActive: member.isActive !== false
    });
    setError('');
  }, [member, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!member) return;
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email.trim())) {
      setError('Valid email required.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/users/${member.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        isActive: form.isActive
      });
      toast?.pushToast({ type: 'success', title: 'Saved', message: `${form.name.trim()} updated.` });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:data-mutated'));
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!member) return null;

  return (
    <Modal open={open} title={`Edit · ${member.name}`} onClose={onClose}>
      <InlineMessage kind="error">{error}</InlineMessage>
      <form className="modal-form minimal-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active
        </label>
        <div className="modal-actions minimal-form-actions">
          <button className="ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
