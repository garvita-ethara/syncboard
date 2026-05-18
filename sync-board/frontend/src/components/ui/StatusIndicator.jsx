import React from 'react';

const labelMap = {
  ACTIVE: 'Active',
  IDLE: 'Idle',
  AWAY: 'Away',
  DND: 'Do Not Disturb'
};

export default function StatusIndicator({ status = 'AWAY', showLabel = true }) {
  const key = String(status || 'AWAY').toUpperCase();
  return (
    <span className={`presence-dot ${key.toLowerCase()}`}>
      {showLabel ? labelMap[key] || key : null}
    </span>
  );
}
