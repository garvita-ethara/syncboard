import React from 'react';

export default function LoadingState({ title = 'Loading', message = 'Fetching the latest workspace data.' }) {
  return (
    <div className="loading-state panel">
      <div className="loading-orb" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
