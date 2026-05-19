import React from 'react';
import { formatStatus, dueLabel, isOverdue } from '../utils/dateUtils';
import EmptyState from './EmptyState';
import ClickableUser from './ClickableUser';

export default function TaskTable({ tasks, onDelete, compact = false }) {
  if (!tasks?.length) {
    return (
      <EmptyState
        title="No tasks found"
        message={compact ? 'There are no tasks to show in this section yet.' : 'Try adjusting the filters or create a task to get started.'}
      />
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            {!compact && <th>Project</th>}
            <th>Assignee</th>
            <th>Priority</th>
            <th>Due</th>
            <th>Status</th>
            {onDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={isOverdue(task) ? 'overdue-row' : ''}>
              <td data-label="Task"><strong>{task.title}</strong><small>{task.description}</small></td>
              {!compact && <td data-label="Project">{task.project?.name || '-'}</td>}
              <td data-label="Assignee">{task.assignee ? <ClickableUser user={task.assignee} className="member-cell" /> : 'Unassigned'}</td>
              <td data-label="Priority"><span className={`priority ${String(task.priority).toLowerCase()}`}>{formatStatus(task.priority)}</span></td>
              <td data-label="Due">{dueLabel(task.dueDate)}</td>
              <td data-label="Status">
                <span className="status-pill">{formatStatus(task.status)}</span>
              </td>
              {onDelete && (
                <td data-label="Actions">
                  <button className="ghost danger-btn icon-btn" type="button" title="Delete" aria-label="Delete task" onClick={() => onDelete(task.id)}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M7 6l1 14h8l1-14" /></svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
