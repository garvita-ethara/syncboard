import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/ui';
import ClickableUser from '../components/ClickableUser';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

const defaultForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'MEMBER',
  isActive: true
};

function dateTimeLabel(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function Users() {
  const api = useApi();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resettingId, setResettingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [resetError, setResetError] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    function onPresenceChanged(event) {
      const { userId, presence } = event.detail || {};
      if (!userId || !presence) return;
      setUsers((current) => current.map((item) => (
        item.id === userId ? { ...item, presence } : item
      )));
    }
    window.addEventListener('presence:changed', onPresenceChanged);
    return () => window.removeEventListener('presence:changed', onPresenceChanged);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      const matchesRole = !filters.role || user.role === filters.role;
      const matchesStatus = !filters.status || String(user.isActive) === filters.status;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [filters, users]);

  function openCreate() {
    setForm(defaultForm);
    setFormError('');
    setCreateOpen(true);
  }

  function openEdit(user) {
    setSelected(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      isActive: user.isActive
    });
    setFormError('');
    setEditOpen(true);
  }

  function openDetails(user) {
    setSelected(user);
    setDetailsOpen(true);
  }

  function validateCreate() {
    if (!form.name.trim()) return 'Display name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) return 'Enter a valid email address';
    if (!form.password) return 'Temporary password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) return 'Password must include letters and numbers';
    if (form.password !== form.confirmPassword) return 'Password and confirm password must match';
    return '';
  }

  function validateEdit() {
    if (!form.name.trim()) return 'Display name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) return 'Enter a valid email address';
    return '';
  }

  async function createUser(e) {
    e.preventDefault();
    setFormError('');
    setActionError('');
    const validation = validateCreate();
    if (validation) {
      setFormError(validation);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        isActive: form.isActive
      });
      setSuccess('User created successfully.');
      toast?.pushToast({ type: 'success', title: 'User created', message: 'Employee credentials are ready for login.' });
      setCreateOpen(false);
      setForm(defaultForm);
      await loadUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateUser(e) {
    e.preventDefault();
    if (!selected) return;
    setFormError('');
    setActionError('');
    const validation = validateEdit();
    if (validation) {
      setFormError(validation);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/users/${selected.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        isActive: form.isActive
      });
      setSuccess('User updated successfully.');
      toast?.pushToast({ type: 'success', title: 'User updated', message: 'User profile changes were saved.' });
      setEditOpen(false);
      await loadUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user) {
    setActionError('');
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      setSuccess(user.isActive ? 'User disabled successfully.' : 'User enabled successfully.');
      toast?.pushToast({ type: 'success', title: 'Account updated', message: user.isActive ? 'User account was disabled.' : 'User account was enabled.' });
      await loadUsers();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setActionError('');
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      setSuccess('User deleted successfully.');
      toast?.pushToast({ type: 'success', title: 'User deleted', message: 'User account has been removed.' });
      await loadUsers();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function resetPassword(user, temporaryPassword) {
    setActionError('');
    setResettingId(user.id);
    try {
      await api.post(`/users/${user.id}/reset-password`, { temporaryPassword: temporaryPassword.trim() });
      setSuccess(`Temporary password reset for ${user.name}.`);
      toast?.pushToast({ type: 'success', title: 'Password reset', message: `Temporary password reset for ${user.name}.` });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setResettingId('');
    }
  }

  function openReset(user) {
    setResetTarget(user);
    setResetForm({ password: '', confirmPassword: '' });
    setResetError('');
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    if (!resetTarget) return;
    if (!resetForm.password) {
      setResetError('Temporary password is required.');
      return;
    }
    if (resetForm.password.length < 6) {
      setResetError('Temporary password must be at least 6 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(resetForm.password) || !/\d/.test(resetForm.password)) {
      setResetError('Temporary password must include letters and numbers.');
      return;
    }
    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError('Password and confirm password must match.');
      return;
    }
    setResetError('');
    await resetPassword(resetTarget, resetForm.password);
    setResetTarget(null);
    setResetForm({ password: '', confirmPassword: '' });
  }

  if (error && !users.length && !loading) return <ErrorCard title="Unable to load users" message={error} onRetry={loadUsers} />;
  if (loading) return <StateSkeleton title="Users" kind="table" />;

  return (
    <section>
      <PageHeader
        title="Users"
        description="Admin-only company directory and employee credential management."
        action={<button className="primary" type="button" onClick={openCreate}>Add User</button>}
      />
      <InlineMessage kind="error">{error || actionError}</InlineMessage>
      <InlineMessage kind="success">{success}</InlineMessage>

      <div className="panel">
        <details className="filters-collapsible" open>
          <summary>Filters</summary>
          <div className="task-filters-grid">
          <label>
            Search users
            <input
              placeholder="Search name or email"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </label>
          <label>
            Role
            <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
            </select>
          </label>
          <label>
            Status
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          </div>
        </details>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Presence</th>
              <th>Created</th>
              <th>Last active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-cell">
                  <EmptyState title="No users found" message="Try changing your filters or create a new employee user." />
                </td>
              </tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="member-cell" data-label="User">
                  <ClickableUser user={user} showEmail />
                </td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Role"><span className={`role-pill ${String(user.role).toLowerCase()}`}>{user.role}</span></td>
                <td data-label="Status">{user.isActive ? 'Active' : 'Disabled'}</td>
                <td data-label="Presence"><span className={`presence-dot ${String(user.presence || '').toLowerCase()}`}>{user.presence || 'AWAY'}</span></td>
                <td data-label="Created">{dateTimeLabel(user.createdAt)}</td>
                <td data-label="Last Active">{dateTimeLabel(user.lastActive)}</td>
                <td data-label="Actions">
                  <div className="table-actions">
                    <button className="ghost icon-btn" type="button" title="View" aria-label="View user" onClick={() => openDetails(user)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button className="ghost icon-btn" type="button" title="Edit" aria-label="Edit user" onClick={() => openEdit(user)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
                    </button>
                    <button className="ghost icon-btn" type="button" title="More" aria-label={user.isActive ? 'Disable user' : 'Enable user'} onClick={() => toggleActive(user)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5h.01M12 12h.01M12 19h.01" /></svg>
                    </button>
                    <button className="ghost icon-btn" type="button" title="Assign" aria-label="Reset password" disabled={resettingId === user.id} onClick={() => openReset(user)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 1 1 2 2l-2 4h4l1-2h2l1-2h2" /></svg>
                    </button>
                    <button className="ghost danger-btn icon-btn" type="button" title="Delete" aria-label="Delete user" onClick={() => setDeleteTarget(user)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={isCreateOpen} title="Create user" onClose={() => setCreateOpen(false)}>
        <form className="modal-form" onSubmit={createUser}>
          <InlineMessage kind="error">{formError}</InlineMessage>
          <label>Display name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Company email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Temporary password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Confirm temporary password<input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label>Account status
            <select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Creating...' : 'Create user'}</button>
        </form>
      </Modal>

      <Modal open={isEditOpen} title="Edit user" onClose={() => setEditOpen(false)}>
        <form className="modal-form" onSubmit={updateUser}>
          <InlineMessage kind="error">{formError}</InlineMessage>
          <label>Display name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label>Account status
            <select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Saving...' : 'Save changes'}</button>
        </form>
      </Modal>

      <Modal open={isDetailsOpen} title="User details" onClose={() => setDetailsOpen(false)}>
        {selected ? (
          <div className="profile-list">
            <div><span>Name</span><strong>{selected.name}</strong></div>
            <div><span>Email</span><strong>{selected.email}</strong></div>
            <div><span>Role</span><strong>{selected.role}</strong></div>
            <div><span>Status</span><strong>{selected.isActive ? 'Active' : 'Disabled'}</strong></div>
            <div><span>Presence</span><strong>{selected.presence || 'AWAY'}</strong></div>
            <div><span>Created</span><strong>{dateTimeLabel(selected.createdAt)}</strong></div>
            <div><span>Last active</span><strong>{dateTimeLabel(selected.lastActive)}</strong></div>
            <div><span>Assigned projects</span><strong>{selected._count?.memberships || 0}</strong></div>
            <div><span>Assigned tasks</span><strong>{selected._count?.assignedTasks || 0}</strong></div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(resetTarget)} title="Reset password" onClose={() => setResetTarget(null)}>
        <form className="modal-form" onSubmit={submitResetPassword}>
          <InlineMessage kind="error">{resetError}</InlineMessage>
          <label>Temporary password<input type="password" value={resetForm.password} onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))} /></label>
          <label>Confirm temporary password<input type="password" value={resetForm.confirmPassword} onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} /></label>
          <button className="primary" type="submit" disabled={Boolean(resettingId)}>{resettingId ? 'Resetting...' : 'Reset password'}</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={`Delete "${deleteTarget?.name || 'this user'}"? This action cannot be undone.`}
        confirmLabel="Delete user"
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteUser}
      />
    </section>
  );
}
