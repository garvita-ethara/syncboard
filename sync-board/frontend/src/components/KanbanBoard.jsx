import React from 'react';
import { formatStatus } from '../utils/dateUtils';

const COLUMNS = ['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'];

export default function KanbanBoard({ tasks, onTaskClick }) {
  const tasksByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status);
    return acc;
  }, {});

  return (
    <div className="kanban-board">
      {COLUMNS.map((status) => (
        <div key={status} className="kanban-column">
          <div className="kanban-column-header">
            <h3>{formatStatus(status)}</h3>
            <span className="kanban-count">{tasksByStatus[status].length}</span>
          </div>
          <div className="kanban-column-content">
            {tasksByStatus[status].map((task) => (
              <div 
                key={task.id} 
                className={`kanban-card priority-${task.priority.toLowerCase()}`}
                onClick={() => onTaskClick(task)}
              >
                <div className="kanban-card-tag">{task.project?.name || 'No Project'}</div>
                <strong className="kanban-card-title">{task.title}</strong>
                <p className="kanban-card-desc line-clamp-2">{task.description}</p>
                <div className="kanban-card-footer">
                  <div className="kanban-card-assignee">
                    {task.assignee ? (
                      <div className="ui-avatar sm" title={task.assignee.name}>
                        {task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    ) : (
                      <div className="ui-avatar sm unassigned">?</div>
                    )}
                  </div>
                  <div className={`kanban-priority-pill ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </div>
                </div>
              </div>
            ))}
            {tasksByStatus[status].length === 0 && (
              <div className="kanban-empty">No tasks</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
