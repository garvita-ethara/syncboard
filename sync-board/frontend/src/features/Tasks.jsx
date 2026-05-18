import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { priorityOptions, statusOptions } from '../constants';
import { dueLabel, formatStatus, isOverdue, toApiDatetime, toDatetimeLocalValue } from '../utils/dateUtils';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ui';
import ClickableUser from '../components/ClickableUser';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';
import KanbanBoard from '../components/KanbanBoard';
import Stat from '../components/Stat';

function getProjectPermission(project, userId, role) {
  if (role === 'ADMIN') return { canManage: true };
  const membership = project?.members?.find((member) => member.user.id === userId) || null;
  const canManage = Boolean(project && (project.createdBy === userId || membership?.role === 'ADMIN'));
  return { membership, canManage };
}

const defaultTaskForm = {
  title: '',
  description: '',
  projectId: '',
  assignedTo: '',
  priority: 'MEDIUM',
  status: 'NOT_STARTED',
  startDate: '',
  dueDate: '',
  estimatedTime: '',
  attachmentNote: ''
};

export default function Tasks() {
  const api = useApi();
  const { user } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [detailComments, setDetailComments] = useState([]);
  const [commentMessage, setCommentMessage] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    projectId: '',
    status: '',
    priority: '',
    assignedTo: '',
    dueDate: '',
    sort: 'newest'
  });
  const [filterDraft, setFilterDraft] = useState(filters);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tasks:view') || 'grid');
  const [quickSort, setQuickSort] = useState(() => localStorage.getItem('tasks:quickSort') || 'recent');
  const [listSort, setListSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [search, setSearch] = useState('');
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [editForm, setEditForm] = useState(defaultTaskForm);
  const [loading, setLoading] = useState(true);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [taskScope, setTaskScope] = useState('team');

  const isAdmin = user?.role === 'ADMIN';

  const managedProjects = useMemo(() => {
    return projects.filter((project) => getProjectPermission(project, user.id, user.role).canManage);
  }, [projects, user.id, user.role]);

  const createAllowed = managedProjects.length > 0;

  const memberProjects = useMemo(() => {
    return projects.filter((project) => project.members.some((member) => member.user.id === user.id) || project.createdBy === user.id);
  }, [projects, user.id]);

  const assigneeOptions = useMemo(() => {
    const sourceProject = projects.find((project) => project.id === filters.projectId) || null;
    if (!sourceProject) {
      const map = new Map();
      memberProjects.forEach((project) => {
        project.members.forEach((member) => {
          map.set(member.user.id, member.user);
        });
      });
      return Array.from(map.values());
    }
    return sourceProject.members.map((member) => member.user);
  }, [filters.projectId, memberProjects, projects]);

  const createAssignees = useMemo(() => {
    const sourceProject = projects.find((project) => project.id === taskForm.projectId);
    return sourceProject ? sourceProject.members.map((member) => member.user) : [];
  }, [projects, taskForm.projectId]);

  const editAssignees = useMemo(() => {
    const sourceProject = projects.find((project) => project.id === editForm.projectId);
    return sourceProject ? sourceProject.members.map((member) => member.user) : [];
  }, [projects, editForm.projectId]);

  async function load(nextFilters = filters, nextScope = taskScope) {
    try {
      setLoading(true);
      setError('');
      const projectData = await api.get('/projects');
      setProjects(projectData.projects);

      const query = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      query.set('scope', nextScope);
      const taskData = await api.get(`/tasks${query.toString() ? `?${query}` : ''}`);

      setFilters((current) => ({ ...current, ...nextFilters }));
      setTasks(taskData.tasks);

      if (!taskForm.projectId && managedProjects[0]) {
        setTaskForm((current) => ({ ...current, projectId: managedProjects[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filters, taskScope); }, [taskScope]);

  function validateTask(payload) {
    if (!payload.title.trim()) return 'Task title is required.';
    if (!payload.projectId) return 'Project is required.';
    if (!payload.assignedTo) return 'Assignee is required.';
    if (!payload.status) return 'Status is required.';
    if (!payload.priority) return 'Priority is required.';
    if (payload.startDate && payload.dueDate && new Date(payload.dueDate) < new Date(payload.startDate)) {
      return 'Due date cannot be before start date.';
    }
    return '';
  }

  async function createTask(event) {
    event.preventDefault();
    setError('');
    const validationError = validateTask(taskForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCreating(true);
    try {
      await api.post('/tasks', {
        title: taskForm.title,
        description: taskForm.description,
        projectId: taskForm.projectId,
        assignedTo: taskForm.assignedTo,
        priority: taskForm.priority,
        status: taskForm.status,
        startDate: toApiDatetime(taskForm.startDate),
        dueDate: toApiDatetime(taskForm.dueDate),
        estimatedTime: taskForm.estimatedTime
      });
      setSuccess('Task created successfully.');
      toast?.pushToast({ type: 'success', title: 'Task created', message: 'Task has been assigned successfully.' });
      setCreateOpen(false);
      setTaskForm(defaultTaskForm);
      await load(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(task, status) {
    setError('');
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      setSuccess('Task status updated successfully.');
      toast?.pushToast({ type: 'success', title: 'Status updated', message: 'Task status has been updated.' });
      await load(filters);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTask(event) {
    event.preventDefault();
    if (!editingTask) return;
    setError('');
    const validationError = validateTask(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUpdating(true);
    try {
      await api.patch(`/tasks/${editingTask.id}`, {
        title: editForm.title,
        description: editForm.description,
        projectId: editForm.projectId,
        assignedTo: editForm.assignedTo,
        priority: editForm.priority,
        status: editForm.status,
        startDate: toApiDatetime(editForm.startDate),
        dueDate: toApiDatetime(editForm.dueDate),
        estimatedTime: editForm.estimatedTime
      });
      setSuccess('Task updated successfully.');
      toast?.pushToast({ type: 'success', title: 'Task updated', message: 'Task changes were saved.' });
      setEditOpen(false);
      setEditingTask(null);
      await load(filters);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function deleteTask(taskId) {
    setError('');
    try {
      await api.delete(`/tasks/${taskId}`);
      setSuccess('Task deleted successfully.');
      toast?.pushToast({ type: 'success', title: 'Task deleted', message: 'Task was removed from the project.' });
      setTaskToDelete(null);
      await load(filters);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openDetails(task) {
    setDetailTask(task);
    setDetailOpen(true);
    try {
      const data = await api.get(`/tasks/${task.id}/comments`);
      setDetailComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    if (!detailTask || !commentMessage.trim()) return;
    setPostingComment(true);
    try {
      const data = await api.post(`/tasks/${detailTask.id}/comments`, { message: commentMessage.trim() });
      setDetailComments((current) => [data.comment, ...current]);
      setCommentMessage('');
      setSuccess('Update added to activity timeline.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPostingComment(false);
    }
  }

  function openEdit(task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      projectId: task.projectId,
      assignedTo: task.assignedTo || '',
      priority: task.priority,
      status: task.status,
      startDate: toDatetimeLocalValue(task.startDate),
      dueDate: toDatetimeLocalValue(task.dueDate),
      estimatedTime: task.estimatedTime || '',
      attachmentNote: ''
    });
    setEditOpen(true);
  }

  function canManageTask(task) {
    if (isAdmin) return true;
    const sourceProject = projects.find((project) => project.id === task.projectId);
    return getProjectPermission(sourceProject, user.id, user.role).canManage;
  }

  function canUpdateTaskStatus(task) {
    if (canManageTask(task)) return true;
    return task.assignedTo === user.id;
  }

  const detailCanComment = detailTask ? (canManageTask(detailTask) || detailTask.assignedTo === user.id) : false;

  const visibleTasks = useMemo(() => {
    const scopeTasks = taskScope === 'mine'
      ? tasks.filter((task) => task.assignedTo === user.id)
      : tasks;
    const q = search.trim().toLowerCase();
    if (!q) return scopeTasks;
    return scopeTasks.filter((task) => (
      String(task.title || '').toLowerCase().includes(q)
      || String(task.description || '').toLowerCase().includes(q)
      || String(task.project?.name || '').toLowerCase().includes(q)
      || String(task.project?.team || '').toLowerCase().includes(q)
      || String(task.assignee?.name || '').toLowerCase().includes(q)
    ));
  }, [taskScope, tasks, user.id, search]);

  useEffect(() => {
    localStorage.setItem('tasks:view', viewMode);
  }, [viewMode]);
  useEffect(() => {
    localStorage.setItem('tasks:quickSort', quickSort);
  }, [quickSort]);
  useEffect(() => {
    setFilterDraft(filters);
  }, [filters]);

  const sortedTasks = useMemo(() => {
    const direction = listSort.direction === 'asc' ? 1 : -1;
    const value = (task, key) => {
      if (key === 'project') return String(task.project?.name || '').toLowerCase();
      if (key === 'assignee') return String(task.assignee?.name || '').toLowerCase();
      if (key === 'dueDate') return task.dueDate ? new Date(task.dueDate).getTime() : 0;
      if (key === 'createdAt') return task.createdAt ? new Date(task.createdAt).getTime() : 0;
      return String(task[key] || '').toLowerCase();
    };
    return [...visibleTasks].sort((a, b) => {
      const av = value(a, listSort.key);
      const bv = value(b, listSort.key);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });
  }, [visibleTasks, listSort]);

  const quickSortedTasks = useMemo(() => {
    const items = [...visibleTasks];
    if (quickSort === 'az') {
      return items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    }
    if (quickSort === 'created') {
      return items.sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));
    }
    return items.sort((a, b) => (new Date(b.updatedAt || b.createdAt || 0).getTime()) - (new Date(a.updatedAt || a.createdAt || 0).getTime()));
  }, [visibleTasks, quickSort]);

  const summary = useMemo(() => {
    const totalTasks = visibleTasks.length;
    const completedTasks = visibleTasks.filter((task) => task.status === 'COMPLETED').length;
    const overdueTasks = visibleTasks.filter((task) => isOverdue(task)).length;
    const activeTasks = visibleTasks.filter((task) => task.status !== 'COMPLETED').length;
    return { totalTasks, completedTasks, overdueTasks, activeTasks };
  }, [visibleTasks]);

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

  function applyFilters() {
    setFilters(filterDraft);
    load(filterDraft);
    setFilterOpen(false);
  }

  function resetFilters() {
    const reset = { search: '', projectId: '', status: '', priority: '', assignedTo: '', dueDate: '', sort: 'newest' };
    setFilters(reset);
    setFilterDraft(reset);
    load(reset);
    setFilterOpen(false);
  }

  function renderEmptyState() {
    if (isAdmin) {
      return (
        <EmptyState
          title="No tasks yet"
          message="Create and assign your first task."
          action={<button className="secondary" type="button" onClick={() => setCreateOpen(true)}>Create Task</button>}
        />
      );
    }
    return <EmptyState title="No tasks assigned" message="Your assigned tasks will appear here." />;
  }

  if (error && !tasks.length && !loading) return <ErrorCard title="Unable to load tasks" message={error} onRetry={() => load(filters, taskScope)} />;
  if (loading && !projects.length && !tasks.length) return <StateSkeleton title="Tasks" kind="table" />;

  return (
    <section className="content-shell">
      <div className="content-container">
      <PageHeader
        toolsOnly
        action={(
          <div className="toolbar tab-toolbar task-toolbar">
            <input
              className="header-search"
              type="search"
              placeholder="Search tasks..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search tasks"
            />
            <div className="team-sort-cluster">
              <select className="team-sort-select" value={taskScope} onChange={(event) => setTaskScope(event.target.value)} aria-label="Task scope">
                <option value="team">Team Tasks</option>
                <option value="mine">My Tasks</option>
              </select>
            </div>
            <div className="team-sort-cluster">
              <select className="team-sort-select" value={quickSort} onChange={(event) => setQuickSort(event.target.value)} aria-label="Sort tasks">
                <option value="recent">Recent</option>
                <option value="created">Last updated</option>
                <option value="az">A-Z</option>
              </select>
            </div>
            <div className="view-icon-toggle" role="tablist" aria-label="Task view">
              <button className={`ghost icon-btn ${viewMode === 'board' ? 'active-view' : ''}`} type="button" aria-label="Board view" title="Board view" onClick={() => { setViewMode('board'); localStorage.setItem('tasks:view', 'board'); }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button className={`ghost icon-btn ${viewMode === 'list' ? 'active-view' : ''}`} type="button" aria-label="List view" title="List view" onClick={() => { setViewMode('list'); localStorage.setItem('tasks:view', 'list'); }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.3" /><circle cx="4" cy="12" r="1.3" /><circle cx="4" cy="18" r="1.3" /></svg>
              </button>
            </div>
            <button className="ghost icon-btn" type="button" aria-label="Toggle filters" title="Filters" onClick={() => setFilterOpen((prev) => !prev)} aria-pressed={isFilterOpen}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18" /><path d="M6 12h12" /><path d="M10 19h4" /></svg>
            </button>
            {createAllowed ? <button className="primary compact-btn" type="button" onClick={() => setCreateOpen(true)}>Create Task</button> : null}
            <button className="ghost icon-btn" type="button" title="Refresh" aria-label="Refresh tasks" onClick={() => load(filters, taskScope)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 0 1-13.66 5.66" /><path d="M4 12a8 8 0 0 1 13.66-5.66" /><path d="M8 18H4v-4" /><path d="M16 6h4v4" /></svg>
            </button>
          </div>
        )}
      />

      <InlineMessage kind="error">{error}</InlineMessage>
      <InlineMessage kind="success">{success}</InlineMessage>
      {isFilterOpen ? (
        <div className="panel inline-filter-panel">
          <div className="task-filters-grid">
            <label>Team
              <select value={filterDraft.projectId} onChange={(e) => setFilterDraft({ ...filterDraft, projectId: e.target.value })}>
                <option value="">All projects</option>
                {memberProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label>Status
              <select value={filterDraft.status} onChange={(e) => setFilterDraft({ ...filterDraft, status: e.target.value })}>
                <option value="">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={filterDraft.priority} onChange={(e) => setFilterDraft({ ...filterDraft, priority: e.target.value })}>
                <option value="">All priorities</option>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
              </select>
            </label>
            <label>Assignee
              <select value={filterDraft.assignedTo} disabled={!isAdmin} onChange={(e) => setFilterDraft({ ...filterDraft, assignedTo: e.target.value })}>
                <option value="">All assignees</option>
                {assigneeOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label>Due date
              <input type="date" value={filterDraft.dueDate} onChange={(e) => setFilterDraft({ ...filterDraft, dueDate: e.target.value })} />
            </label>
            <div className="split-actions">
              <button className="secondary" type="button" onClick={applyFilters}>Apply</button>
              <button className="ghost" type="button" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="stats-grid tasks-summary-grid">
        <Stat label="Total Tasks" value={summary.totalTasks} />
        <Stat label="Active Tasks" value={summary.activeTasks} />
        <Stat label="Completed" value={summary.completedTasks} />
        <Stat label="Overdue" value={summary.overdueTasks} />
      </div>

      {viewMode === 'board' ? (
        <KanbanBoard
          tasks={sortedTasks}
          onTaskClick={(task) => {
            setDetailTask(task);
            setDetailOpen(true);
          }}
          onStatusChange={updateStatus}
        />
      ) : viewMode === 'list' ? (
        <div className="panel table-wrap">
          <table className="tasks-list-table">
            <thead>
              <tr>
                <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('title')}>Title</button></th>
                <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('project')}>Project</button></th>
                <th>Team</th>
                <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('assignee')}>Assignee</button></th>
                <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('status')}>Status</button></th>
                <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('priority')}>Priority</button></th>
                <th><button type="button" className="table-sort-btn" onClick={() => toggleSort('dueDate')}>Due Date</button></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-cell">{renderEmptyState()}</td>
                </tr>
              )}
              {[...sortedTasks].sort((a, b) => {
                if (quickSort === 'az') return String(a.title || '').localeCompare(String(b.title || ''));
                if (quickSort === 'created') return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
                return (new Date(b.updatedAt || b.createdAt || 0).getTime()) - (new Date(a.updatedAt || a.createdAt || 0).getTime());
              }).map((task) => {
                const overdue = isOverdue(task);
                const canManage = canManageTask(task);
                const canUpdateStatus = canUpdateTaskStatus(task);
                return (
                  <tr key={task.id} className={overdue ? 'overdue-row' : ''}>
                    <td data-label="Title">
                      <strong>{task.title}</strong>
                      <small>{task.description || 'No description provided.'}</small>
                    </td>
                    <td data-label="Project">{task.project?.name || '-'}</td>
                    <td data-label="Team">{task.project?.team || '-'}</td>
                    <td data-label="Assignee">{task.assignee ? <ClickableUser user={task.assignee} className="member-cell" /> : 'Unassigned'}</td>
                    <td data-label="Status">
                      {canUpdateStatus ? (
                        <select className="ui-select-trigger" value={task.status} onChange={(e) => updateStatus(task, e.target.value)}>
                          {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                        </select>
                      ) : <span className={`status-pill ${task.status.toLowerCase()}`}>{formatStatus(task.status)}</span>}
                    </td>
                    <td data-label="Priority"><span className={`priority ${String(task.priority).toLowerCase()}`}>{formatStatus(task.priority)}</span></td>
                    <td data-label="Due Date">{overdue ? <span className="overdue-badge">Overdue</span> : dueLabel(task.dueDate)}</td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        <button className="ghost icon-btn task-icon-btn" type="button" title="View task" aria-label="View task" onClick={() => openDetails(task)}>
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        {canManage ? (
                          <button className="ghost icon-btn task-icon-btn" type="button" title="Edit task" aria-label="Edit task" onClick={() => openEdit(task)}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <button className="ghost danger-btn icon-btn task-icon-btn" type="button" title="Delete task" aria-label="Delete task" onClick={() => setTaskToDelete(task)}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="tasks-card-grid">
          {visibleTasks.length === 0 ? (
            <div className="panel">{renderEmptyState()}</div>
          ) : quickSortedTasks.map((task) => {
            const overdue = isOverdue(task);
            const canManage = canManageTask(task);
            const canUpdateStatus = canUpdateTaskStatus(task);
            return (
              <article key={task.id} className={`tasks-grid-card ${overdue ? 'is-overdue' : ''}`}>
                <div className="tasks-grid-head">
                  <strong className="line-clamp-1">{task.title}</strong>
                  <span className={`status-pill ${task.status.toLowerCase()}`}>{formatStatus(task.status)}</span>
                </div>
                <p className="line-clamp-2 tasks-grid-desc">{task.description || 'No description provided.'}</p>
                <div className="tasks-grid-metrics">
                  <span>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                    {task.project?.name || '-'}
                  </span>
                  <span>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" /></svg>
                    {task.assignee?.name || 'Unassigned'}
                  </span>
                  <span className={overdue ? 'metric-overdue' : ''}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                    {overdue ? 'Overdue' : dueLabel(task.dueDate)}
                  </span>
                </div>
                <div className="tasks-grid-meta">
                  <span>{task.project?.team || 'No team'}</span>
                  <span>{formatStatus(task.priority)}</span>
                  <span>{task.estimatedTime || 'No estimate'}</span>
                </div>
                <div className="tasks-grid-foot">
                  {canUpdateStatus ? (
                    <select className="ui-select-trigger" value={task.status} onChange={(e) => updateStatus(task, e.target.value)}>
                      {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                    </select>
                  ) : <span className={`priority ${String(task.priority).toLowerCase()}`}>{formatStatus(task.priority)}</span>}
                  <div className="task-inline-actions">
                    <button className="ghost icon-btn task-icon-btn" type="button" title="View task" aria-label="View task" onClick={() => openDetails(task)}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    {canManage ? <button className="ghost icon-btn task-icon-btn" type="button" title="Edit task" aria-label="Edit task" onClick={() => openEdit(task)}><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg></button> : null}
                    {isAdmin ? <button className="ghost danger-btn icon-btn task-icon-btn" type="button" title="Delete task" aria-label="Delete task" onClick={() => setTaskToDelete(task)}><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg></button> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={isCreateOpen} title="Add task" onClose={() => setCreateOpen(false)}>
        <form className="modal-form stack" onSubmit={createTask} noValidate>
          <label>Task title<input className="ui-input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></label>
          <label>Description<textarea className="ui-textarea" rows={4} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></label>
          <div className="grid-two">
            <label>Project
              <select className="ui-select-trigger" value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value, assignedTo: '' })}>
                <option value="">Select project</option>
                {managedProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label>Assigned user
              <select className="ui-select-trigger" value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                <option value="">Select assignee</option>
                {createAssignees.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid-two">
            <label>Status
              <select className="ui-select-trigger" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select>
            </label>
            <label>Priority
              <select className="ui-select-trigger" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
              </select>
            </label>
          </div>
          <div className="grid-two">
            <label>Start date<input className="ui-input" type="datetime-local" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} /></label>
            <label>Due date<input className="ui-input" type="datetime-local" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></label>
          </div>
          <label>Estimated time<input className="ui-input" value={taskForm.estimatedTime} onChange={(e) => setTaskForm({ ...taskForm, estimatedTime: e.target.value })} placeholder="e.g., 5h" /></label>
          <button className="submit-btn" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create task'}</button>
        </form>
      </Modal>

      <Modal open={isEditOpen} title="Edit task" onClose={() => setEditOpen(false)}>
        <form className="modal-form" onSubmit={updateTask} noValidate>
          <label>Task title<input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
          <label>Description<textarea rows={4} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label>
          <label>Project
            <select value={editForm.projectId} onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value, assignedTo: '' })}>
              <option value="">Select project</option>
              {managedProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label>Assigned user
            <select value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}>
              <option value="">Select assignee</option>
              {editAssignees.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
              {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{formatStatus(priority)}</option>)}
            </select>
          </label>
          <label>Start date<input type="datetime-local" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} /></label>
          <label>Due date<input type="datetime-local" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></label>
          <label>Estimated time<input value={editForm.estimatedTime} onChange={(e) => setEditForm({ ...editForm, estimatedTime: e.target.value })} placeholder="e.g., 5h" /></label>
          <label>Attachment placeholder<input value={editForm.attachmentNote} onChange={(e) => setEditForm({ ...editForm, attachmentNote: e.target.value })} placeholder="e.g., spec-link.pdf (placeholder)" /></label>
          <button className="primary" type="submit" disabled={updating}>{updating ? 'Saving...' : 'Save changes'}</button>
        </form>
      </Modal>

      <Modal open={isDetailOpen} title="Task details" onClose={() => setDetailOpen(false)}>
        {detailTask ? (
          <div className="stack">
            <div className="panel">
              <div className="panel-heading">
                <h2>{detailTask.title}</h2>
                <span className={`priority ${String(detailTask.priority).toLowerCase()}`}>{formatStatus(detailTask.priority)}</span>
              </div>
              <p className="muted">{detailTask.description || 'No description provided.'}</p>
              <div className="detail-stats" style={{ marginTop: 10 }}>
                <div className="detail-stat"><span>Project</span><strong>{detailTask.project?.name || '-'}</strong></div>
                <div className="detail-stat"><span>Assignee</span>{detailTask.assignee ? <ClickableUser user={detailTask.assignee} className="member-cell" /> : <strong>Unassigned</strong>}</div>
                <div className="detail-stat"><span>Status</span><strong>{formatStatus(detailTask.status)}</strong></div>
                <div className="detail-stat"><span>Estimated time</span><strong>{detailTask.estimatedTime || '—'}</strong></div>
                <div className="detail-stat"><span>Created</span><strong>{dueLabel(detailTask.createdAt)}</strong></div>
                <div className="detail-stat"><span>Updated</span><strong>{dueLabel(detailTask.updatedAt)}</strong></div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading"><h3>Activity Timeline</h3></div>
              {detailCanComment ? (
                <form className="stack" onSubmit={addComment}>
                  <label>Add update
                    <textarea rows={3} value={commentMessage} onChange={(e) => setCommentMessage(e.target.value)} placeholder="Share progress, blockers, or notes..." />
                  </label>
                  <button className="secondary" type="submit" disabled={postingComment}>{postingComment ? 'Posting...' : 'Add update'}</button>
                </form>
              ) : (
                <p className="muted">You can only add updates to tasks assigned to you.</p>
              )}
              <div className="stack" style={{ marginTop: 12 }}>
                {detailComments.length === 0 ? <EmptyState title="No updates yet" message="Task activity updates will appear here." /> : null}
                {detailComments.map((comment) => (
                  <div key={comment.id} className="mini-stat">
                    {comment.user ? <ClickableUser user={comment.user} className="member-cell" /> : <strong>Unknown user</strong>}
                    <p className="muted" style={{ marginTop: 4 }}>{comment.message}</p>
                    <small className="muted">{new Date(comment.createdAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete task"
        message={`Delete "${taskToDelete?.title || 'this task'}"?`}
        confirmLabel="Delete task"
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => deleteTask(taskToDelete.id)}
      />
      </div>
    </section>
  );
}
