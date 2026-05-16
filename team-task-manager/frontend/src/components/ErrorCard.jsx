import React from 'react';

export default function ErrorCard({ title = 'Something went wrong', message = 'We could not load this section.', onRetry }) {
  return (
    <div className="error-card panel">
      <div className="error-card-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <div>
        <strong>{title}</strong>
        <p className="muted">{message}</p>
      </div>
      {onRetry ? <button className="secondary" type="button" onClick={onRetry}>Retry</button> : null}
    </div>
  );
}

