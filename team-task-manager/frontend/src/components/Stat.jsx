import React from 'react';

const iconByLabel = {
  'Total Teams': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h18M3 7h12M3 17h14" />
    </svg>
  ),
  'Total Members': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <circle cx="16.5" cy="10.5" r="2.5" />
      <path d="M4 19a5 5 0 0 1 10 0M14 18a4 4 0 0 1 6 0" />
    </svg>
  ),
  Projects: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  Tasks: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  'Total Projects': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  'Active Projects': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 9v3l2 2" />
    </svg>
  ),
  'Completed Projects': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  'Total Tasks': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  'Assigned Tasks': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v6" />
      <circle cx="12" cy="15" r="6" />
    </svg>
  ),
  'Completed Tasks': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m8.5 12 2.2 2.2L15.5 9" />
    </svg>
  ),
  'In Progress Tasks': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12V8M12 12l3 2" />
    </svg>
  ),
  'Overdue Tasks': (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  ),
};

const fallbackIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="3" />
  </svg>
);

export default function Stat({ label, value, caption = '', trend = '', trendLabel = '', danger }) {
  return (
    <div className={`stat-card ${danger ? 'danger' : ''}`}>
      <div className="stat-card-top">
        <div className="stat-icon" aria-hidden="true">{iconByLabel[label] || fallbackIcon}</div>
        {trend && (
          <div className={`stat-trend ${trend.startsWith('+') ? 'up' : 'down'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className="stat-body">
        <strong className="stat-value">{value}</strong>
        <span className="stat-label">{label}</span>
      </div>
      {(caption || trendLabel) && (
        <div className="stat-footer">
          {caption && <small className="stat-caption">{caption}</small>}
          {trendLabel && <small className="stat-trend-label">{trendLabel}</small>}
        </div>
      )}
    </div>
  );
}
