import React from 'react';

export default function Avatar({ name = '', initials = '', presence, size = 'md' }) {
  const fallback = name
    ? name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'SB';
  return (
    <span className={`ui-avatar ${size}`}>
      {initials || fallback}
      {presence ? <span className={`ui-avatar-presence ${String(presence).toLowerCase()}`} /> : null}
    </span>
  );
}
