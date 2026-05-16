import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Drawer from '../components/ui/Drawer';
import ProjectDetail from './ProjectDetail';
import { priorityOptions, projectStatusOptions } from '../constants';
import { dateLabel, formatStatus, toApiDatetime, toDatetimeLocalValue } from '../utils/dateUtils';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ui';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';
import Stat from '../components/Stat';

function statusTone(status) {
  return String(status || '').toLowerCase();
}

const defaultProjectForm = {
  name: '',
  description: '',
  team: '',
  status: 'NOT_STARTED',
  priority: 'MEDIUM',
  startDate: '',
  dueDate: '',
  memberIds: []
};



export default function Projects() {
  const api = useApi();
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createAllowed, setCreateAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [form, setForm] = useState(defaultProjectForm);
  const [editForm, setEditForm] = useState(defaultProjectForm);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignedTo: '',
    dateFrom: '',
    dateTo: '',
    sort: 'newest'
  });
  const [filterDraft, setFilterDraft] = useState(filters);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('projects:view') || 'grid');
  const [quickSort, setQuickSort] = useState(() => localStorage.getItem('projects:quickSort') || 'recent');
  const [listSort, setListSort] = useState({ key: 'createdAt', direction: 'desc' });
  const canCreate = user?.role === 'ADMIN';

  useEffect(() => {
    localStorage.setItem('projects:view', viewMode);
  }, [viewMode]);
  useEffect(() => {
    localStorage.setItem('projects:quickSort', quickSort);
  }, [quickSort]);
  useEffect(() => {
    setFilterDraft(filters);
  }, [filters]);

  async function load(nextFilters = filters) {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      const [projectData, teamData] = await Promise.all([
        api.get(`/projects${query.toString() ? `?${query}` : ''}`),
        api.get('/users/team')
      ]);

      const sanitizedProjects = projectData.projects || [];
      setProjects(sanitizedProjects);
      setCreateAllowed(Boolean(projectData.createAllowed));
      setTeamUsers(teamData.users || []);
      setSelectedId((current) => {
        if (sanitizedProjects.some((project) => project.id === current)) return current;
        return sanitizedProjects[0]?.id || null;
      });
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

  const visibleProjects = projects;
  const selected = visibleProjects.find((project) => project.id === selectedId);
  const canManageSelected = user?.role === 'ADMIN';

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.team).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const memberTeamMap = useMemo(() => {
    const map = new Map();
    visibleProjects.forEach((project) => {
      (project.members || []).forEach((member) => {
        map.set(member.user.id, project);
      });
    });
    return map;
  }, [visibleProjects]);

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      description: selected.description || '',
      team: selected.team || '',
      status: selected.status || 'NOT_STARTED',
      priority: selected.priority || 'MEDIUM',
      startDate: toDatetimeLocalValue(selected.startDate),
      dueDate: toDatetimeLocalValue(selected.dueDate),
      memberIds: selected.members.map((member) => member.user.id)
    });
  }, [selected]);

  const summary = useMemo(() => {
    const totalProjects = visibleProjects.length;
    const activeProjects = visibleProjects.filter((project) => project.status === 'IN_PROGRESS' || project.status === 'NOT_STARTED').length;
    const totalTasks = visibleProjects.reduce((acc, project) => acc + (project._count?.tasks || 0), 0);
    const totalMembers = visibleProjects.reduce((acc, project) => acc + (project._count?.members || 0), 0);
    return { totalProjects, activeProjects, totalTasks, totalMembers };
  }, [visibleProjects]);

  const sortedProjects = useMemo(() => {
    const direction = listSort.direction === 'asc' ? 1 : -1;
    const value = (project, key) => {
      if (key === 'members') return project._count?.members || 0;
      if (key === 'tasks') return project._count?.tasks || 0;
      if (key === 'progress') return project.progressPercentage || 0;
      if (key === 'dueDate') return project.dueDate ? new Date(project.dueDate).getTime() : 0;
      if (key === 'createdAt') return project.createdAt ? new Date(project.createdAt).getTime() : 0;
      return String(project[key] || '').toLowerCase();
    };
    return [...visibleProjects].sort((a, b) => {
      const av = value(a, listSort.key);
      const bv = value(b, listSort.key);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });
  }, [visibleProjects, listSort]);

  const quickSortedProjects = useMemo(() => {
    const items = [...visibleProjects];
    if (quickSort === 'az') {
      return items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    if (quickSort === 'created') {
      return items.sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));
    }
    return items.sort((a, b) => (new Date(b.updatedAt || b.createdAt || 0).getTime()) - (new Date(a.updatedAt || a.createdAt || 0).getTime()));
  }, [visibleProjects, quickSort]);

  function toggleSort(key) {
    setListSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }

  function sortMark(key) {
    if (listSort.key !== key) return '↕';
    return listSort.direction === 'asc' ? '↑' : '↓';
  }

  function validateProject(projectForm) {
    if (!projectForm.name.trim()) return 'Project name is required.';
    if (!projectForm.team.trim()) return 'Team is required.';
    if (!projectForm.status) return 'Status is required.';
    if (!projectForm.priority) return 'Priority is required.';
    if (projectForm.startDate && projectForm.dueDate && new Date(projectForm.dueDate) < new Date(projectForm.startDate)) {
      return 'Due date cannot be before start date.';
    }
    return '';
  }

  function applyFilters() {
    setFilters(filterDraft);
    load(filterDraft);
    setFilterOpen(false);
  }

  function resetFilters() {
    const reset = { search: '', status: '', priority: '', assignedTo: '', dateFrom: '', dateTo: '', sort: 'newest' };
    setFilters(reset);
    setFilterDraft(reset);
    load(reset);
    setFilterOpen(false);
  }

  function toggleMember(formState, memberId) {
    const exists = formState.memberIds.includes(memberId);
    return {
      ...formState,
      memberIds: exists ? formState.memberIds.filter((id) => id !== memberId) : [...formState.memberIds, memberId]
    };
  }

  function getMemberAvailability(member, currentProjectId = null) {
    const existingProject = memberTeamMap.get(member.id);
    if (!existingProject) {
      return { disabled: false, reason: '' };
    }

    if (existingProject.id === currentProjectId) {
      return { disabled: false, reason: '' };
    }

    if (member.role === 'MEMBER') {
      return {
        disabled: true,
        reason: `Already assigned to ${existingProject.name}`
      };
    }

    return { disabled: false, reason: '' };
  }

  async function syncMembers(projectId, nextMemberIds, currentMemberIds = []) {
    const byId = new Map(teamUsers.map((person) => [person.id, person]));
    const toAdd = nextMemberIds.filter((id) => !currentMemberIds.includes(id));
    const toRemove = currentMemberIds.filter((id) => !nextMemberIds.includes(id));
    for (const userId of toAdd) {
      const person = byId.get(userId);
      if (!person) continue;
      await api.post(`/projects/${projectId}/members`, { email: person.email, role: 'MEMBER' });
    }
    for (const userId of toRemove) {
      await api.delete(`/projects/${projectId}/members/${userId}`);
    }
  }

  async function createProject(event) {
    event.preventDefault();
    setError('');
    const validationError = validateProject(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCreating(true);
    try {
      const data = await api.post('/projects', {
        name: form.name,
        description: form.description,
        team: form.team,
        status: form.status,
        priority: form.priority,
        startDate: toApiDatetime(form.startDate),
        dueDate: toApiDatetime(form.dueDate)
      });
      await syncMembers(data.project.id, form.memberIds.filter((id) => id !== user.id), [user.id]);
      setSuccess(`Project "${data.project.name}" created successfully.`);
      toast?.pushToast({ type: 'success', title: 'Project created', message: `${data.project.name} is now in your workspace.` });
      setForm(defaultProjectForm);
      setCreateOpen(false);
      await load();
      setSelectedId(data.project.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function updateProject(event) {
    event.preventDefault();
    if (!selectedId || !selected) return;
    setError('');
    const validationError = validateProject(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUpdating(true);
    try {
      const data = await api.patch(`/projects/${selectedId}`, {
        name: editForm.name,
        description: editForm.description,
        team: editForm.team,
        status: editForm.status,
        priority: editForm.priority,
        startDate: toApiDatetime(editForm.startDate),
        dueDate: toApiDatetime(editForm.dueDate)
      });
      const currentMemberIds = selected.members.map((member) => member.user.id);
      await syncMembers(selectedId, editForm.memberIds, currentMemberIds);
      setSuccess(`Project "${data.project.name}" updated successfully.`);
      toast?.pushToast({ type: 'success', title: 'Project updated', message: `${data.project.name} changes were saved.` });
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function deleteProject(projectId) {
    setError('');
    try {
      await api.delete(`/projects/${projectId}`);
      setSuccess('Project deleted successfully.');
      toast?.pushToast({ type: 'success', title: 'Project deleted', message: 'Project and related references were removed.' });
      setProjectToDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !projects.length && !loading) return <ErrorCard title="Unable to load projects" message={error} onRetry={() => load(filters)} />;
  if (loading) return <StateSkeleton title="Projects" kind="table" />;

  return (
    <section>
      <PageHeader
        title="Projects"
        action={(
          <div className="toolbar">
            <div className="quick-sort-pills" role="tablist" aria-label="Projects sort">
              <button className={`ghost ${quickSort === 'az' ? 'active-view' : ''}`} type="button" onClick={() => setQuickSort('az')}>A-Z</button>
              <button className={`ghost ${quickSort === 'recent' ? 'active-view' : ''}`} type="button" onClick={() => setQuickSort('recent')}>Recent</button>
              <button className={`ghost ${quickSort === 'created' ? 'active-view' : ''}`} type="button" onClick={() => setQuickSort('created')}>Last updated</button>
            </div>
            <div className="view-icon-toggle" role="tablist" aria-label="Projects view">
              <button className={`ghost icon-btn ${viewMode === 'grid' ? 'active-view' : ''}`} type="button" aria-label="Grid view" title="Grid view" onClick={() => setViewMode('grid')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button className={`ghost icon-btn ${viewMode === 'list' ? 'active-view' : ''}`} type="button" aria-label="List view" title="List view" onClick={() => setViewMode('list')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.3" /><circle cx="4" cy="12" r="1.3" /><circle cx="4" cy="18" r="1.3" /></svg>
              </button>
            </div>
            <button className="ghost icon-btn" type="button" aria-label="Open filters" title="Filters" onClick={() => setFilterOpen(true)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18" /><path d="M6 12h12" /><path d="M10 19h4" /></svg>
            </button>
            {canCreate ? <button className="primary" type="button" onClick={() => setCreateOpen(true)}>Create Project</button> : null}
          </div>
        )}
      />

      <InlineMessage kind="error">{error}</InlineMessage>
      <InlineMessage kind="success">{success}</InlineMessage>

      <div className="stats-grid projects-summary-grid">
        <Stat label="Total Projects" value={summary.totalProjects} />
        <Stat label="Active Projects" value={summary.activeProjects} />
        <Stat label="Total Tasks" value={summary.totalTasks} />
        <Stat label="Total Members" value={summary.totalMembers} />
      </div>

      <div className="surface-grid projects-surface">
        <div className="panel project-list-panel">
          {visibleProjects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              message={canCreate ? 'Create your first project to begin.' : 'Projects will appear once an admin creates them.'}
              action={canCreate ? <button className="secondary" type="button" onClick={() => setCreateOpen(true)}>Create Project</button> : null}
            />
          ) : viewMode === 'grid' ? (
            <div className="project-card-grid">
              {quickSortedProjects.map((project) => {
                const total = project._count?.tasks || 0;
                const completed = project.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
                const progress = project.progressPercentage || 0;

                return (
                  <article
                    key={project.id}
                    className={`stat-card project-grid-card ${selectedId === project.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(project.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="stat-card-top">
                      <strong className="line-clamp-1">{project.name}</strong>
                      <span className={`status-pill ${statusTone(project.status)}`}>{formatStatus(project.status)}</span>
                    </div>

                    <div className="project-grid-body">
                      <div className="project-grid-tasks">
                        <strong>{completed}/{total} Tasks Completed</strong>
                        <span>{progress}% Progress</span>
                      </div>
                      <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
                    </div>

                    <div className="project-grid-foot">
                      <div className="project-grid-due">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        <span>{project.dueDate ? `Due in ${dateLabel(project.dueDate)}` : 'No deadline'}</span>
                      </div>
                      <div className="project-grid-team">
                        <span>{project.team || 'Personal'}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('name')}>Project {sortMark('name')}</button></th>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('status')}>Status {sortMark('status')}</button></th>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('priority')}>Priority {sortMark('priority')}</button></th>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('members')}>Members {sortMark('members')}</button></th>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('tasks')}>Tasks {sortMark('tasks')}</button></th>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('progress')}>Progress {sortMark('progress')}</button></th>
                    <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('dueDate')}>Due {sortMark('dueDate')}</button></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sortedProjects].sort((a, b) => {
                    if (quickSort === 'az') return String(a.name || '').localeCompare(String(b.name || ''));
                    if (quickSort === 'created') return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
                    return (new Date(b.updatedAt || b.createdAt || 0).getTime()) - (new Date(a.updatedAt || a.createdAt || 0).getTime());
                  }).map((project) => (
                    <tr key={project.id} className={`selectable-row ${selectedId === project.id ? 'table-active-row' : ''}`} onClick={() => setSelectedId(project.id)}>
                      <td data-label="Project"><strong>{project.name}</strong><small className="line-clamp-1">{project.description || 'No description'}</small></td>
                      <td data-label="Status"><span className={`status-pill ${statusTone(project.status)}`}>{formatStatus(project.status)}</span></td>
                      <td data-label="Priority"><span className={`priority ${String(project.priority).toLowerCase()}`}>{formatStatus(project.priority)}</span></td>
                      <td data-label="Members">{project._count?.members || 0}</td>
                      <td data-label="Tasks">{project._count?.tasks || 0}</td>
                      <td data-label="Progress">{project.progressPercentage || 0}%</td>
                      <td data-label="Due">{project.dueDate ? dateLabel(project.dueDate) : 'No due date'}</td>
                      <td data-label="Actions">
                        <div className="project-card-actions" onClick={(event) => event.stopPropagation()}>
                          <button className="secondary icon-btn" type="button" title="View" aria-label="View project" onClick={() => setSelectedId(project.id)}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                          {canCreate ? <button className="ghost icon-btn" type="button" title="Edit" aria-label="Edit project" onClick={() => { setSelectedId(project.id); setEditOpen(true); }}><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg></button> : null}
                          {canCreate ? <button className="ghost danger-btn icon-btn" type="button" title="Delete" aria-label="Delete project" onClick={() => setProjectToDelete(project)}><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg></button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel detail-panel project-details-panel">
          {selected ? (
            <ProjectDetail
              projectId={selected.id}
              onChanged={() => load(filters)}
              onEdit={() => setEditOpen(true)}
              onDelete={() => setProjectToDelete(selected)}
              canManageSelected={canManageSelected}
              teamUsers={teamUsers}
            />
          ) : (
            <EmptyState title="No project selected" message="Select a project to view details." />
          )}
        </div>
      </div>

      <Modal open={isCreateOpen} title="Create project" onClose={() => setCreateOpen(false)}>
        <form className="modal-form stack" onSubmit={createProject} noValidate>
          <div className="grid-two">
            <label>Project name<input className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Team
              <select className="ui-select-trigger" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
                <option value="">Select a team</option>
                {uniqueTeams.map((team) => <option key={team} value={team}>{team}</option>)}
              </select>
            </label>
          </div>
          <label>Description<textarea className="ui-textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="grid-two">
            <label>Status
              <select className="ui-select-trigger" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {projectStatusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <label>Priority
              <select className="ui-select-trigger" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
              </select>
            </label>
          </div>
          <div className="grid-two">
            <label>Start date<input className="ui-input" type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
            <label>Due date<input className="ui-input" type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
          </div>
          <div className="panel">
            <strong>Assigned members</strong>
            <div className="stack" style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8 }}>
              {teamUsers.map((member) => (
                <label key={member.id} className="checkbox">
                  {(() => {
                    const availability = getMemberAvailability(member, null);
                    return (
                      <>
                        <input
                          type="checkbox"
                          checked={form.memberIds.includes(member.id)}
                          disabled={availability.disabled}
                          onChange={() => setForm((current) => toggleMember(current, member.id))}
                        />
                        {member.name} ({member.email}) {availability.reason ? `- ${availability.reason}` : ''}
                      </>
                    );
                  })()}
                </label>
              ))}
            </div>
          </div>
          <button className="submit-btn" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create project'}</button>
        </form>
      </Modal>

      <Modal open={isEditOpen} title="Edit project" onClose={() => setEditOpen(false)}>
        <form className="modal-form stack" onSubmit={updateProject} noValidate>
          <div className="grid-two">
            <label>Project name<input className="ui-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
            <label>Team
              <select className="ui-select-trigger" value={editForm.team} onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}>
                <option value="">Select a team</option>
                {uniqueTeams.map((team) => <option key={team} value={team}>{team}</option>)}
              </select>
            </label>
          </div>
          <label>Description<textarea className="ui-textarea" rows={4} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
          <div className="grid-two">
            <label>Status
              <select className="ui-select-trigger" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {projectStatusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <label>Priority
              <select className="ui-select-trigger" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
              </select>
            </label>
          </div>
          <div className="grid-two">
            <label>Start date<input className="ui-input" type="datetime-local" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} /></label>
            <label>Due date<input className="ui-input" type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></label>
          </div>
          <div className="panel">
            <strong>Assigned members</strong>
            <div className="stack" style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8 }}>
              {teamUsers.map((member) => (
                <label key={member.id} className="checkbox">
                  {(() => {
                    const availability = getMemberAvailability(member, selectedId);
                    return (
                      <>
                        <input
                          type="checkbox"
                          checked={editForm.memberIds.includes(member.id)}
                          disabled={availability.disabled}
                          onChange={() => setEditForm((current) => toggleMember(current, member.id))}
                        />
                        {member.name} ({member.email}) {availability.reason ? `- ${availability.reason}` : ''}
                      </>
                    );
                  })()}
                </label>
              ))}
            </div>
          </div>
          <button className="submit-btn" type="submit" disabled={updating}>{updating ? 'Saving...' : 'Save changes'}</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        title="Delete project"
        message={`Delete "${projectToDelete?.name || 'this project'}"? This will remove related tasks and project memberships.`}
        confirmLabel="Delete project"
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => deleteProject(projectToDelete.id)}
      />

      <Drawer open={isFilterOpen} title="Project Filters" onClose={() => setFilterOpen(false)}>
        <div className="stack">
          <label>Search<input value={filterDraft.search} onChange={(e) => setFilterDraft({ ...filterDraft, search: e.target.value })} placeholder="Search projects" /></label>
          <label>Team
            <select value={filterDraft.assignedTo} onChange={(e) => setFilterDraft({ ...filterDraft, assignedTo: e.target.value })}>
              <option value="">All teams</option>
              {teamUsers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={filterDraft.status} onChange={(e) => setFilterDraft({ ...filterDraft, status: e.target.value })}>
              <option value="">All</option>
              {projectStatusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={filterDraft.priority} onChange={(e) => setFilterDraft({ ...filterDraft, priority: e.target.value })}>
              <option value="">All</option>
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
            </select>
          </label>
          <label>Due from<input type="date" value={filterDraft.dateFrom} onChange={(e) => setFilterDraft({ ...filterDraft, dateFrom: e.target.value })} /></label>
          <label>Due to<input type="date" value={filterDraft.dateTo} onChange={(e) => setFilterDraft({ ...filterDraft, dateTo: e.target.value })} /></label>
          <div className="split-actions">
            <button className="secondary" type="button" onClick={applyFilters}>Apply</button>
            <button className="ghost" type="button" onClick={resetFilters}>Reset</button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
