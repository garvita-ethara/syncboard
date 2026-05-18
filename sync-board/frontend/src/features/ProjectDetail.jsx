import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import TaskTable from '../components/TaskTable';
import { priorityOptions } from '../constants';
import { dateLabel } from '../utils/dateUtils';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import ClickableUser from '../components/ClickableUser';
import { useUserProfilePanel } from '../context/UserProfilePanelContext';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

export default function ProjectDetail({ projectId, onChanged, onEdit, onDelete, canManageSelected, teamUsers = [] }) {
  const api = useApi();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', priority: 'MEDIUM' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const { openProfile } = useUserProfilePanel();

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await api.get(`/projects/${projectId}`);
      setProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [api, projectId]);

  async function addMember(event) {
    event.preventDefault();
    setError('');
    setAddingMember(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email: memberEmail, role: memberRole });
      setSuccess('Member added successfully.');
      setMemberEmail('');
      setMemberRole('MEMBER');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  }

  async function changeMemberRole(userId, role) {
    setError('');
    try {
      await api.patch(`/projects/${projectId}/members/${userId}`, { role });
      setSuccess('Member role updated successfully.');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMember(memberId) {
    setError('');
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      setSuccess('Member removed successfully.');
      setMemberToRemove(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setError('');
    setCreatingTask(true);
    try {
      await api.post('/tasks', {
        ...taskForm,
        projectId,
        assignedTo: taskForm.assignedTo || null
      });
      setSuccess('Task created successfully.');
      setTaskForm({ title: '', description: '', assignedTo: '', priority: 'MEDIUM' });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingTask(false);
    }
  }

  async function updateTaskStatus(task, status) {
    setError('');
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      setSuccess('Task status updated successfully.');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(taskId) {
    setError('');
    try {
      await api.delete(`/tasks/${taskId}`);
      setSuccess('Task deleted successfully.');
      setTaskToDelete(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  const currentMembership = useMemo(() => {
    return project?.members.find((member) => member.user.id === user.id) || null;
  }, [project, user.id]);

  async function duplicateProject() {
    setError('');
    try {
      const data = await api.post('/projects', {
        name: `${project.name} (Copy)`,
        description: project.description,
        team: project.team,
        status: 'ACTIVE',
        priority: project.priority
      });
      setSuccess(`Project duplicated as "${data.project.name}"`);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function archiveProject() {
    setError('');
    try {
      await api.patch(`/projects/${projectId}`, { status: 'CANCELLED' });
      setSuccess('Project archived successfully.');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !project && !loading) return <ErrorCard title="Unable to load project details" message={error} onRetry={load} />;
  if (loading || !project) return <StateSkeleton title="Project Details" kind="table" />;

  const fallbackCanManage = user.role === 'ADMIN' || project.createdBy === user.id || currentMembership?.role === 'ADMIN';
  const canManage = canManageSelected ?? fallbackCanManage;
  const adminCount = project.members.filter((member) => member.role === 'ADMIN').length;
  const complete = project.tasks.filter((task) => task.status === 'COMPLETED').length;
  const totalTasks = project.tasks.length;
  const overdueCount = project.tasks.filter((task) => task.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date()).length;
  const progress = totalTasks ? Math.round((complete / totalTasks) * 100) : 0;
  const recentUpdates = [...project.tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="project-detail-shell">
      <InlineMessage kind="error">{error}</InlineMessage>
      <InlineMessage kind="success">{success}</InlineMessage>

      <div className="panel">
        <div className="panel-heading">
          <h3>Overview</h3>
          {canManage && (
            <div className="toolbar">
              <button className="ghost compact-btn" type="button" onClick={duplicateProject}>Duplicate</button>
              <button className="ghost compact-btn" type="button" onClick={archiveProject}>Archive</button>
            </div>
          )}
        </div>
        <p className="muted">Status, ownership, timeline, and delivery context for this project.</p>
      </div>

      <div className="detail-hero">
        <div className="detail-hero-card">
          <div className="panel-heading">
            <div>
              <h2>{project.name}</h2>
              <p>{project.description || 'No description provided for this project yet.'}</p>
            </div>
            <span className={`status-pill ${String(project.status).toLowerCase()}`}>{project.status}</span>
          </div>
          <div className="detail-stats">
            <div className="detail-stat"><span>Team</span><strong>{project.team || `${project.name} Team`}</strong></div>
            <div className="detail-stat"><span>Created by</span><ClickableUser user={project.creator} className="member-cell" /></div>
            <div className="detail-stat"><span>Created date</span><strong>{dateLabel(project.createdAt)}</strong></div>
            <div className="detail-stat"><span>Members</span><strong>{project.members.length}</strong></div>
            <div className="detail-stat"><span>Tasks</span><strong>{totalTasks}</strong></div>
            <div className="detail-stat"><span>Risk</span><strong>{project.riskStatus === 'OVERDUE' ? 'Overdue' : 'On Track'}</strong></div>
          </div>
          {canManage && (
            <div className="split-actions">
              <button className="ghost icon-btn" type="button" title="Edit" aria-label="Edit project" onClick={onEdit}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12 6 4 4" /></svg>
              </button>
              <button className="ghost danger-btn icon-btn" type="button" title="Delete" aria-label="Delete project" onClick={onDelete}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
              </button>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Progress</h2>
            <strong>{progress}% complete</strong>
          </div>
          <div className="metric-strip">
            <div className="mini-stat"><span>Completed</span><strong>{complete}</strong></div>
            <div className="mini-stat"><span>Open</span><strong>{Math.max(totalTasks - complete, 0)}</strong></div>
            <div className="mini-stat"><span>Overdue</span><strong>{overdueCount}</strong></div>
            <div className="mini-stat"><span>Admins</span><strong>{adminCount}</strong></div>
          </div>
          <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Members</h3>
            <p className="muted">Admins can add members, remove members, and change roles while preserving at least one admin.</p>
          </div>
          <span className="muted">{adminCount} admin {adminCount === 1 ? 'member' : 'members'}</span>
        </div>

        {project.members.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {project.members.map((member) => {
                  const isCreator = member.user.id === project.createdBy;
                  const isLastAdmin = member.role === 'ADMIN' && adminCount <= 1;

                  return (
                    <tr key={member.id}>
                      <td data-label="Name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="avatar avatar-link-btn"
                            title={member.user.name}
                            onClick={(event) => { event.stopPropagation(); openProfile(member.user); }}
                          >
                            {(member.user.name || '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                          </button>
                          <div>
                            <button type="button" className="inline-link-btn" onClick={() => openProfile(member.user)}>{member.user.name}</button>
                            {isCreator && <small style={{ display: 'block' }}>Project creator</small>}
                          </div>
                        </div>
                      </td>
                      <td data-label="Email">{member.user.email}</td>
                      <td data-label="Role">
                        {canManage ? (
                          <select
                            className="member-role-select"
                            value={member.role}
                            disabled={isCreator || isLastAdmin}
                            onChange={(event) => changeMemberRole(member.user.id, event.target.value)}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                          </select>
                        ) : (
                          <span className={`role-pill ${member.role.toLowerCase()}`}>{member.role}</span>
                        )}
                      </td>
                      {canManage && (
                        <td data-label="Actions">
                          <button
                            className="ghost danger-btn icon-btn"
                            type="button"
                            title="Delete"
                            aria-label="Remove member"
                            disabled={isCreator || isLastAdmin}
                            onClick={() => setMemberToRemove(member)}
                          >
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No members added" message="Add collaborators to start assigning work inside this project." />
        )}

        {canManage && (
          <form className="member-form" onSubmit={addMember}>
            <label>
              Add member
              <select value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required>
                <option value="">Select a user</option>
                {teamUsers
                  .filter((u) => !project.members.some((m) => m.user.id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                  ))
                }
              </select>
            </label>
            <label>
              Role
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <button className="secondary" type="submit" disabled={addingMember}>{addingMember ? 'Inviting...' : 'Invite Member'}</button>
          </form>
        )}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Tasks</h3>
            <p className="muted">Only project members can be assigned. Overdue tasks are highlighted in red automatically.</p>
          </div>
          <span className="muted">{totalTasks} total tasks</span>
        </div>

        {canManage && (
          <form className="task-form project-task-form" onSubmit={createTask}>
            <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
            <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
              <option value="">Unassigned</option>
              {project.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
            </select>
            <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              {priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
            <input className="wide" placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            <button className="primary" type="submit" disabled={creatingTask}>{creatingTask ? 'Creating...' : 'Create Task'}</button>
          </form>
        )}

        {project.tasks.length ? (
          <TaskTable tasks={project.tasks} onStatusChange={canManage ? updateTaskStatus : undefined} onDelete={canManage ? (taskId) => setTaskToDelete(project.tasks.find((task) => task.id === taskId) || null) : undefined} compact />
        ) : (
          <EmptyState title="No tasks assigned" message={canManage ? 'Create the first task to start tracking delivery for this project.' : 'No tasks have been created in this project yet.'} />
        )}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h3>Recent Updates</h3>
        </div>
        {recentUpdates.length ? (
          <div className="stack">
            {recentUpdates.map((task) => (
              <div key={task.id} className="mini-stat">
                <strong>{task.title}</strong>
                <span>{task.assignee?.name || 'Unassigned'} | {task.status}</span>
                <small className="muted">Updated {new Date(task.updatedAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No updates yet" message="Task activity updates will appear as work progresses." />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(memberToRemove)}
        title="Remove member"
        message={`Remove ${memberToRemove?.user?.name || 'this member'} from the project?`}
        confirmLabel="Remove member"
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => removeMember(memberToRemove.user.id)}
      />

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete task"
        message={`Delete "${taskToDelete?.title || 'this task'}"?`}
        confirmLabel="Delete task"
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => deleteTask(taskToDelete.id)}
      />
    </div>
  );
}
