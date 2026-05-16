import React, { useMemo } from 'react';

export default function ProfileMenu({
  user,
  onOpenProfile,
  className = '',
  triggerClassName = ''
}) {
  const initials = useMemo(() => {
    if (!user?.name) return 'SB';
    return user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }, [user?.name]);

  return (
    <div className={`profile-menu-wrap ${className}`.trim()}>
      <button
        className={`ghost profile-menu-trigger ${triggerClassName}`.trim()}
        type="button"
        onClick={() => onOpenProfile?.()}
        aria-haspopup="dialog"
        aria-label="Open profile editor"
      >
        <div className="profile-item-content">
          <span className="avatar">{initials}</span>
          <span className={`presence-dot ${String(user?.presence || 'ACTIVE').toLowerCase()}`} />
          <span className="profile-trigger-meta">
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </span>
          <span className="profile-trigger-caret" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 7 5 6 5-6" />
            </svg>
          </span>
        </div>
      </button>
    </div>
  );
}
