import React from 'react';

export default function EmptyState({ title, message, action, tone = 'default' }) {
  return (
    <div className={`empty-state empty-state-${tone}`}>
      <div className="empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {tone === 'danger'
            ? <path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
            : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></>}
        </svg>
      </div>
      <div className="empty-state-copy">
        <strong>{title}</strong>
        {message && <p>{message}</p>}
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
