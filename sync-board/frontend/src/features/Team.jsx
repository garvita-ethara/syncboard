import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';
import { projectStatusOptions } from '../constants';
import { formatStatus, toApiDatetime } from '../utils/dateUtils';
import { useToast } from '../components/ui';
import { useUserProfilePanel } from '../context/UserProfilePanelContext';

const defaultTeamForm = {
  name: '',
  team: '',
  status: 'NOT_STARTED'
};

function progressFromTasks(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function isOverdueTask(task) {
  return task?.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
}

export default function Team() {
  const api = useApi();
  const toast = useToast();
  const { user } = useAuth();
  const { openProfile } = useUserProfilePanel();

  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [form, setForm] = useState(defaultTeamForm);
  const [editForm, setEditForm] = useState(defaultTeamForm);
  const [editingTeam, setEditingTeam] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('teams:view') || 'grid');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('teams:sort') || 'recent');

  const canCreateTeam = user?.role === 'ADMIN';

  async function load() {
    try {
      setError('');
      const data = await api.get('/projects');
      const list = (data.projects || []).map((project) => {
        const tasks = project.tasks || [];
        const openTasks = tasks.filter((task) => task.status !== 'COMPLETED').length;
        return {
          ...project,
          progress: progressFromTasks(tasks),
          openTasks,
          overdueTasks: tasks.filter(isOverdueTask).length,
          teamLead: project.creator?.name || 'Unknown'
        };
      });
      setTeams(list);
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
    localStorage.setItem('teams:view', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('teams:sort', sortBy);
  }, [sortBy]);

  const visibleTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? teams.filter((team) =>
        team.name.toLowerCase().includes(query) || (team.team || '').toLowerCase().includes(query) || team.teamLead.toLowerCase().includes(query)
      )
      : teams;

    if (sortBy === 'az') {
      return [...filtered].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    if (sortBy === 'created') {
      return [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return [...filtered].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  }, [teams, search, sortBy]);

  function validate(payload) {
    if (!payload.name.trim()) return 'Name is required.';
    if (!payload.team.trim()) return 'Group is required.';
    return '';
  }

  async function createTeam(event) {
    event.preventDefault();
    setError('');
    const message = validate(form);
    if (message) {
      setError(message);
      return;
    }

    setCreating(true);
    try {
      const data = await api.post('/projects', {
        name: form.name.trim(),
        team: form.team.trim(),
        description: '',
        status: form.status,
        priority: 'MEDIUM',
        startDate: toApiDatetime(''),
        dueDate: toApiDatetime('')
      });
      toast?.pushToast({ type: 'success', title: 'Team created', message: data.project.name });
      setCreateOpen(false);
      setForm(defaultTeamForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(team) {
    setEditingTeam(team);
    setEditForm({
      name: team.name || '',
      team: team.team || '',
      status: team.status || 'NOT_STARTED'
    });
    setEditOpen(true);
  }

  async function updateTeam(event) {
    event.preventDefault();
    if (!editingTeam) return;
    setError('');
    const message = validate(editForm);
    if (message) {
      setError(message);
      return;
    }
    setUpdating(true);
    try {
      const data = await api.patch(`/projects/${editingTeam.id}`, {
        name: editForm.name.trim(),
        team: editForm.team.trim(),
        status: editForm.status
      });
      toast?.pushToast({ type: 'success', title: 'Team updated', message: data.project.name });
      setEditOpen(false);
      setEditingTeam(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function deleteTeam(teamId) {
    setError('');
    try {
      await api.delete(`/projects/${teamId}`);
      toast?.pushToast({ type: 'success', title: 'Team deleted', message: 'Team was removed.' });
      setTeamToDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !teams.length && !loading) return <ErrorCard title="Unable to load teams" message={error} onRetry={load} />;
  if (loading) return <StateSkeleton title="Teams" kind="cards" />;

  return (
    <section className="content-shell">
      <div className="content-container">
        <PageHeader
          toolsOnly
          action={(
            <div className="toolbar tab-toolbar team-toolbar">
              <input
                className="header-search"
                type="search"
                placeholder="Search teams..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search teams"
              />
              <div className="team-sort-cluster">
                <select className="team-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort teams">
                  <option value="recent">Last updated</option>
                  <option value="created">Created</option>
                  <option value="az">Alphabetical</option>
                </select>
              </div>
              <div className="view-icon-toggle" role="tablist" aria-label="Teams view">
                <button className={`ghost icon-btn ${viewMode === 'grid' ? 'active-view' : ''}`} type="button" aria-label="Grid view" title="Grid view" onClick={() => setViewMode('grid')}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </button>
                <button className={`ghost icon-btn ${viewMode === 'list' ? 'active-view' : ''}`} type="button" aria-label="List view" title="List view" onClick={() => setViewMode('list')}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.3" /><circle cx="4" cy="12" r="1.3" /><circle cx="4" cy="18" r="1.3" /></svg>
                </button>
              </div>
              {canCreateTeam ? <button className="primary compact-btn" type="button" onClick={() => setCreateOpen(true)}>New Team</button> : null}
            </div>
          )}
        />

        <InlineMessage kind="error">{error}</InlineMessage>

        <div className="panel teams-strip-panel">
          {visibleTeams.length === 0 ? (
            <EmptyState title="No teams" message={canCreateTeam ? 'Create a team to get started.' : 'No teams yet.'} />
          ) : viewMode === 'grid' ? (
            <div className="team-cards-grid team-cards-grid-four" role="list">
              {visibleTeams.map((team) => (
                <article key={team.id} className="team-card team-card-minimal" role="listitem">
                  <div className="team-card-head">
                    <strong className="line-clamp-1 team-card-title">{team.name}</strong>
                    <span className={`status-pill ${String(team.status).toLowerCase()} team-status-chip`}>{formatStatus(team.status)}</span>
                  </div>
                  <span className="team-card-lead">
                    {team.creator ? (
                      <button type="button" className="inline-link-btn" onClick={() => openProfile(team.creator)}>
                        {team.creator.name}
                      </button>
                    ) : team.teamLead}
                  </span>
                  <div className="progress-cell">
                    <div className="progress-track"><div style={{ width: `${team.progress}%` }} /></div>
                    <span>{team.progress}% · {team.openTasks} open</span>
                  </div>
                  {canCreateTeam ? (
                    <div className="team-card-actions">
                      <button className="ghost icon-btn" type="button" title="Edit team" aria-label="Edit team" onClick={() => openEdit(team)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
                      </button>
                      <button className="ghost danger-btn icon-btn" type="button" title="Delete team" aria-label="Delete team" onClick={() => setTeamToDelete(team)}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Group</th>
                    <th>Lead</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Open</th>
                    {canCreateTeam ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleTeams.map((team) => (
                    <tr key={team.id}>
                      <td><strong>{team.name}</strong></td>
                      <td>{team.team || '-'}</td>
                      <td>
                        {team.creator ? (
                          <button type="button" className="inline-link-btn" onClick={() => openProfile(team.creator)}>
                            {team.creator.name}
                          </button>
                        ) : team.teamLead}
                      </td>
                      <td><span className={`status-pill ${String(team.status).toLowerCase()}`}>{formatStatus(team.status)}</span></td>
                      <td>{team.progress}%</td>
                      <td>{team.openTasks}</td>
                      {canCreateTeam ? (
                        <td>
                          <div className="table-actions">
                            <button className="ghost icon-btn" type="button" title="Edit team" aria-label="Edit team" onClick={() => openEdit(team)}>
                              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
                            </button>
                            <button className="ghost danger-btn icon-btn" type="button" title="Delete team" aria-label="Delete team" onClick={() => setTeamToDelete(team)}>
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

        <Modal open={isCreateOpen} title="Create team" onClose={() => setCreateOpen(false)}>
          <form className="modal-form minimal-form" onSubmit={createTeam} noValidate>
            <label>Team name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus /></label>
            <label>Group<input value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} /></label>
            <label>Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {projectStatusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <div className="modal-actions minimal-form-actions">
              <button className="ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>

        <Modal open={isEditOpen} title="Edit team" onClose={() => setEditOpen(false)}>
          <form className="modal-form minimal-form" onSubmit={updateTeam} noValidate>
            <label>Team name<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} autoFocus /></label>
            <label>Group<input value={editForm.team} onChange={(event) => setEditForm({ ...editForm, team: event.target.value })} /></label>
            <label>Status
              <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                {projectStatusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <div className="modal-actions minimal-form-actions">
              <button className="ghost" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="primary" type="submit" disabled={updating}>{updating ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>

        <ConfirmDialog
          open={Boolean(teamToDelete)}
          title="Delete team"
          message={`Delete "${teamToDelete?.name || 'this team'}"? This will remove related tasks and memberships.`}
          confirmLabel="Delete team"
          onClose={() => setTeamToDelete(null)}
          onConfirm={() => deleteTeam(teamToDelete.id)}
        />
      </div>
    </section>
  );
}
