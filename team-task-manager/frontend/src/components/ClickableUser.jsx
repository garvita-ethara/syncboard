import React from 'react';
import { useUserProfilePanel } from '../context/UserProfilePanelContext';

function initialsFromName(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SB';
}

export default function ClickableUser({ user, showEmail = false, className = 'member-cell' }) {
  const { openProfile } = useUserProfilePanel();
  if (!user) return <span>-</span>;

  return (
    <button
      type="button"
      className={`user-link-btn ${className}`.trim()}
      onClick={() => openProfile(user)}
      title={`View ${user.name} profile (${user.presence || 'Offline'})`}
    >
      <div className="avatar-wrap">
        <span className="avatar">{user.avatarInitials || initialsFromName(user.name)}</span>
        <span className={`presence-indicator ${String(user.presence || 'OFFLINE').toLowerCase()}`} />
      </div>
      <div className="user-link-info">
        <strong>{user.name}</strong>
        {showEmail ? <small>{user.email}</small> : null}
      </div>
    </button>
  );
}

