import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';
import { projectStatusOptions } from '../constants';
import { formatStatus, toApiDatetime } from '../utils/dateUtils';
import { useToast } from '../components/ui';
import { useUserProfilePanel } from '../context/UserProfilePanelContext';

const defaultTeamForm = {
  name: '',
  team: '',
  description: '',
  status: 'NOT_STARTED',
  priority: 'MEDIUM',
  startDate: '',
  dueDate: ''
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
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(defaultTeamForm);
  const [search, setSearch] = useState('');
  const { openProfile } = useUserProfilePanel();

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
    const id = setInterval(load, 15000);
    window.addEventListener('app:data-mutated', load);
    return () => {
      clearInterval(id);
      window.removeEventListener('app:data-mutated', load);
    };
  }, []);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) =>
      team.name.toLowerCase().includes(q) || team.teamLead.toLowerCase().includes(q)
    );
  }, [teams, search]);

  async function createTeam(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.team.trim()) {
      setError('Group is required.');
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
      toast?.pushToast({ type: 'success', title: 'Created', message: data.project.name });
      setCreateOpen(false);
      setForm(defaultTeamForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (error && !teams.length && !loading) return <ErrorCard title="Unable to load teams" message={error} onRetry={load} />;
  if (loading) return <StateSkeleton title="Teams" kind="cards" />;

  return (
    <section className="minimal-page">
      <PageHeader
        title="Teams"
        action={(
          <div className="header-actions">
            <input
              className="header-search"
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search teams"
            />
            {canCreateTeam ? <button className="primary compact-btn" type="button" onClick={() => setCreateOpen(true)}>New</button> : null}
          </div>
        )}
      />
      <InlineMessage kind="error">{error}</InlineMessage>

      <div className="panel teams-strip-panel">
        {filteredTeams.length === 0 ? (
          <EmptyState title="No teams" message={canCreateTeam ? 'Create a team to get started.' : 'No teams yet.'} />
        ) : (
          <div className="team-cards-strip" role="list">
            {filteredTeams.map((team) => (
              <article key={team.id} className="team-card team-card-horizontal team-card-minimal" role="listitem">
                <div className="team-card-head">
                  <strong className="line-clamp-1">{team.name}</strong>
                  <span className={`status-pill ${String(team.status).toLowerCase()}`}>{formatStatus(team.status)}</span>
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
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal open={isCreateOpen} title="New team" onClose={() => setCreateOpen(false)}>
        <form className="modal-form minimal-form" onSubmit={createTeam} noValidate>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></label>
          <label>Group<input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} /></label>
          <label>Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {projectStatusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </label>
          <div className="modal-actions minimal-form-actions">
            <button className="ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
