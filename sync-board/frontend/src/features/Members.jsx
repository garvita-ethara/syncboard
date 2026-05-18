import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import ClickableUser from '../components/ClickableUser';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';
import { useToast } from '../components/ui';

function presenceClass(presence) {
  return `presence-dot ${String(presence || '').toLowerCase()}`;
}

const defaultCreateForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'MEMBER',
  isActive: true
};

const defaultEditForm = {
  name: '',
  email: '',
  role: 'MEMBER',
  isActive: true
};

export default function Members() {
  const api = useApi();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('members:sort') || 'recent');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('members:view') || 'list');
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ role: '', status: '', presence: '', team: '' });
  const [filterDraft, setFilterDraft] = useState(filters);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [usersData, projectsData] = await Promise.all([
        isAdmin ? api.get('/users') : api.get('/users/team'),
        api.get('/projects')
      ]);

      const projectByUser = new Map();
      (projectsData.projects || []).forEach((project) => {
        (project.members || []).forEach((member) => {
          if (!projectByUser.has(member.user.id)) projectByUser.set(member.user.id, []);
          projectByUser.get(member.user.id).push(project.name);
        });
      });

      setMembers((usersData.users || []).map((member) => ({
        ...member,
        primaryTeam: (projectByUser.get(member.id) || [])[0] || '-'
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener('app:data-mutated', load);
    return () => window.removeEventListener('app:data-mutated', load);
  }, []);

  useEffect(() => {
    localStorage.setItem('members:sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('members:view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    function onPresenceChanged(event) {
      const { userId, presence } = event.detail || {};
      if (!userId || !presence) return;
      setMembers((current) => current.map((member) => (
        member.id === userId ? { ...member, presence } : member
      )));
    }
    window.addEventListener('presence:changed', onPresenceChanged);
    return () => window.removeEventListener('presence:changed', onPresenceChanged);
  }, []);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(members.map((member) => member.primaryTeam).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [members]);

  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = members.filter((member) => {
      const matchesSearch = !q
        || member.name.toLowerCase().includes(q)
        || member.email.toLowerCase().includes(q)
        || String(member.primaryTeam).toLowerCase().includes(q);
      const matchesRole = !filters.role || member.role === filters.role;
      const matchesStatus = !filters.status || String(member.isActive) === filters.status;
      const matchesPresence = !filters.presence || String(member.presence || '').toUpperCase() === filters.presence;
      const matchesTeam = !filters.team || member.primaryTeam === filters.team;
      return matchesSearch && matchesRole && matchesStatus && matchesPresence && matchesTeam;
    });

    if (sortBy === 'az') {
      return [...filtered].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    if (sortBy === 'created') {
      return [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return [...filtered].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  }, [members, search, filters, sortBy]);

  function applyFilters() {
    setFilters(filterDraft);
    setFilterOpen(false);
  }

  function resetFilters() {
    const reset = { role: '', status: '', presence: '', team: '' };
    setFilters(reset);
    setFilterDraft(reset);
    setFilterOpen(false);
  }

  function openCreate() {
    setCreateForm(defaultCreateForm);
    setFormError('');
    setCreateOpen(true);
  }

  function openEdit(member) {
    setEditMember(member);
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'MEMBER',
      isActive: member.isActive !== false
    });
    setFormError('');
    setEditOpen(true);
  }

  function validateCreateForm() {
    if (!createForm.name.trim()) return 'Name is required.';
    if (!createForm.email.trim() || !/\S+@\S+\.\S+/.test(createForm.email.trim())) return 'Valid email required.';
    if (!createForm.password) return 'Temporary password is required.';
    if (createForm.password.length < 6) return 'Password must be at least 6 characters.';
    if (createForm.password !== createForm.confirmPassword) return 'Password and confirm password must match.';
    return '';
  }

  function validateEditForm() {
    if (!editForm.name.trim()) return 'Name is required.';
    if (!editForm.email.trim() || !/\S+@\S+\.\S+/.test(editForm.email.trim())) return 'Valid email required.';
    return '';
  }

  async function createMember(event) {
    event.preventDefault();
    setActionError('');
    setFormError('');
    const message = validateCreateForm();
    if (message) {
      setFormError(message);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users', {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        isActive: createForm.isActive
      });
      setSuccess('Member created successfully.');
      toast?.pushToast({ type: 'success', title: 'Member created', message: 'New member was added to workspace.' });
      setCreateOpen(false);
      await load();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:data-mutated'));
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateMember(event) {
    event.preventDefault();
    if (!editMember) return;
    setActionError('');
    setFormError('');
    const message = validateEditForm();
    if (message) {
      setFormError(message);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/users/${editMember.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive
      });
      setSuccess('Member updated successfully.');
      toast?.pushToast({ type: 'success', title: 'Member updated', message: `${editForm.name.trim()} details saved.` });
      setEditOpen(false);
      setEditMember(null);
      await load();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:data-mutated'));
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteMember() {
    if (!deleteTarget) return;
    setActionError('');
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setSuccess('Member deleted successfully.');
      toast?.pushToast({ type: 'success', title: 'Member deleted', message: `${deleteTarget.name} was removed.` });
      setDeleteTarget(null);
      await load();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:data-mutated'));
      }
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (error && !members.length && !loading) return <ErrorCard title="Unable to load members" message={error} onRetry={load} />;
  if (loading) return <StateSkeleton title="Members" kind="table" />;

  return (
    <section className="content-shell">
      <div className="content-container">
        <PageHeader
          toolsOnly
          action={(
            <div className="toolbar tab-toolbar team-toolbar members-toolbar">
              <input
                className="header-search"
                type="search"
                placeholder="Search members..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search members"
              />
              <div className="team-sort-cluster">
                <select className="team-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort members">
                  <option value="recent">Last updated</option>
                  <option value="created">Created</option>
                  <option value="az">Alphabetical</option>
                </select>
              </div>
              <div className="view-icon-toggle" role="tablist" aria-label="Members view">
                <button className={`ghost icon-btn ${viewMode === 'grid' ? 'active-view' : ''}`} type="button" aria-label="Grid view" title="Grid view" onClick={() => setViewMode('grid')}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </button>
                <button className={`ghost icon-btn ${viewMode === 'list' ? 'active-view' : ''}`} type="button" aria-label="List view" title="List view" onClick={() => setViewMode('list')}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.3" /><circle cx="4" cy="12" r="1.3" /><circle cx="4" cy="18" r="1.3" /></svg>
                </button>
              </div>
              <button className="ghost icon-btn" type="button" aria-label="Toggle filters" title="Filters" onClick={() => setFilterOpen((prev) => !prev)} aria-pressed={isFilterOpen}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18" /><path d="M6 12h12" /><path d="M10 19h4" /></svg>
              </button>
              {isAdmin ? <button className="primary compact-btn" type="button" onClick={openCreate}>Add Member</button> : null}
            </div>
          )}
        />
        <InlineMessage kind="error">{error || actionError}</InlineMessage>
        <InlineMessage kind="success">{success}</InlineMessage>
        {isFilterOpen ? (
          <div className="panel inline-filter-panel">
            <div className="task-filters-grid">
              <label>Role
                <select value={filterDraft.role} onChange={(event) => setFilterDraft({ ...filterDraft, role: event.target.value })}>
                  <option value="">All roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              </label>
              <label>Status
                <select value={filterDraft.status} onChange={(event) => setFilterDraft({ ...filterDraft, status: event.target.value })}>
                  <option value="">All statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <label>Presence
                <select value={filterDraft.presence} onChange={(event) => setFilterDraft({ ...filterDraft, presence: event.target.value })}>
                  <option value="">All presence</option>
                  <option value="ONLINE">Online</option>
                  <option value="AWAY">Away</option>
                  <option value="DND">DND</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </label>
              <label>Team
                <select value={filterDraft.team} onChange={(event) => setFilterDraft({ ...filterDraft, team: event.target.value })}>
                  <option value="">All teams</option>
                  {uniqueTeams.map((team) => <option key={team} value={team}>{team}</option>)}
                </select>
              </label>
              <div className="split-actions">
                <button className="secondary" type="button" onClick={applyFilters}>Apply</button>
                <button className="ghost" type="button" onClick={resetFilters}>Reset</button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="panel">
          {visibleMembers.length === 0 ? (
            <EmptyState title="No members" message="Try changing search or filters." />
          ) : viewMode === 'grid' ? (
            <div className="members-card-grid members-card-grid-four" role="list">
              {visibleMembers.map((member) => (
                <article key={member.id} className="member-card" role="listitem">
                  <div className="member-card-head">
                    <ClickableUser user={member} showEmail />
                  </div>
                  <div className="member-card-meta">
                    <span className={`role-pill ${String(member.role).toLowerCase()}`}>{member.role}</span>
                    <span className={presenceClass(member.presence)}>{member.presence || 'AWAY'}</span>
                  </div>
                  <div className="member-card-metrics">
                    <span title={member.primaryTeam}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
                      {member.primaryTeam}
                    </span>
                    <span>{member._count?.assignedTasks || 0} tasks</span>
                    <span>{member.isActive ? 'Active' : 'Disabled'}</span>
                  </div>
                  {isAdmin ? (
                    <div className="table-actions">
                      <button className="ghost icon-btn" type="button" title="Edit member" aria-label="Edit member" onClick={() => openEdit(member)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
                      </button>
                      <button className="ghost danger-btn icon-btn" type="button" title="Delete member" aria-label="Delete member" onClick={() => setDeleteTarget(member)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="minimal-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Tasks</th>
                    {isAdmin ? <th className="col-actions">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="member-cell"><ClickableUser user={member} /></td>
                      <td><span className={`role-pill ${String(member.role).toLowerCase()}`}>{member.role}</span></td>
                      <td>{member.primaryTeam}</td>
                      <td><span className={presenceClass(member.presence)}>{member.presence || 'AWAY'}</span></td>
                      <td>{member._count?.assignedTasks || 0}</td>
                      {isAdmin ? (
                        <td className="col-actions">
                          <div className="table-actions">
                            <button className="ghost icon-btn" type="button" title="Edit member" aria-label="Edit member" onClick={() => openEdit(member)}>
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
                            </button>
                            <button className="ghost danger-btn icon-btn" type="button" title="Delete member" aria-label="Delete member" onClick={() => setDeleteTarget(member)}>
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={isCreateOpen} title="Create member" onClose={() => setCreateOpen(false)}>
          <form className="modal-form minimal-form" onSubmit={createMember}>
            <InlineMessage kind="error">{formError}</InlineMessage>
            <label>Name<input value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} autoFocus /></label>
            <label>Email<input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} /></label>
            <label>Temporary password<input type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} /></label>
            <label>Confirm password<input type="password" value={createForm.confirmPassword} onChange={(event) => setCreateForm({ ...createForm, confirmPassword: event.target.value })} /></label>
            <label>Role
              <select value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value })}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label>Account status
              <select value={String(createForm.isActive)} onChange={(event) => setCreateForm({ ...createForm, isActive: event.target.value === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <div className="modal-actions minimal-form-actions">
              <button className="ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create member'}</button>
            </div>
          </form>
        </Modal>

        <Modal open={isEditOpen} title={`Edit member${editMember ? ` - ${editMember.name}` : ''}`} onClose={() => setEditOpen(false)}>
          <form className="modal-form minimal-form" onSubmit={updateMember}>
            <InlineMessage kind="error">{formError}</InlineMessage>
            <label>Name<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} autoFocus /></label>
            <label>Email<input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
            <label>Role
              <select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label>Account status
              <select value={String(editForm.isActive)} onChange={(event) => setEditForm({ ...editForm, isActive: event.target.value === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <div className="modal-actions minimal-form-actions">
              <button className="ghost" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete member"
          message={`Delete "${deleteTarget?.name || 'this member'}"? This action cannot be undone.`}
          confirmLabel="Delete member"
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteMember}
        />
      </div>
    </section>
  );
}
