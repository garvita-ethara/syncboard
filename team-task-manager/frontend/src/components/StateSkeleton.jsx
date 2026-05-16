import React from 'react';

export default function StateSkeleton({ kind = 'cards', title = 'Loading...' }) {
  return (
    <section className={`state-skeleton state-skeleton-${kind}`}>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="muted">Preparing workspace data.</p>
        </div>
      </div>

      {kind === 'table' ? (
        <div className="panel">
          <div className="skeleton skeleton-line" style={{ width: '30%', marginBottom: 14 }} />
          <div className="skeleton-table">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton skeleton-line" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="stat-card">
                <div className="skeleton skeleton-line" style={{ width: '48%', marginBottom: 12 }} />
                <div className="skeleton skeleton-line" style={{ width: '24%', height: 30 }} />
              </div>
            ))}
          </div>
          <div className="grid-two">
            <div className="panel">
              <div className="skeleton skeleton-line" style={{ width: '36%', marginBottom: 12 }} />
              <div className="skeleton skeleton-block" />
            </div>
            <div className="panel">
              <div className="skeleton skeleton-line" style={{ width: '42%', marginBottom: 12 }} />
              <div className="skeleton skeleton-block" />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
