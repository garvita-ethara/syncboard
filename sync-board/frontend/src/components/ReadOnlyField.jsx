import React from 'react';

export default function ReadOnlyField({ label, value }) {
  return (
    <div className="field-readonly">
      <span className="field-readonly-label">{label}</span>
      <span className="field-readonly-value">{value || '—'}</span>
    </div>
  );
}
