import React, { useEffect, useMemo, useRef, useState } from 'react';
import { navigate } from '../utils/router';

export default function ProfileMenu({
  user,
  onSetPresence,
  onLogout,
  className = '',
  triggerClassName = ''
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const initials = useMemo(() => {
    if (!user?.name) return 'SB';
    return user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }, [user?.name]);
  const currentPresence = String(user?.presence || 'ACTIVE').toUpperCase();
  const presenceOptions = [
    { value: 'ACTIVE', label: 'Online' },
    { value: 'IDLE', label: 'Idle' },
    { value: 'AWAY', label: 'Away' },
    { value: 'DND', label: 'Do Not Disturb' }
  ];

  useEffect(() => {
    function onGlobalClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onGlobalClick);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onGlobalClick);
      window.removeEventListener('keydown', onEscape);
    };
  }, []);

  async function applyPresence(nextValue) {
    await onSetPresence?.(nextValue);
    setOpen(false);
  }

  return (
    <div className={`profile-menu-wrap ${className}`.trim()} ref={rootRef}>
      <button
        className={`ghost profile-menu-trigger ${triggerClassName}`.trim()}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
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
      {open ? (
        <div className="profile-menu-popover" role="menu" aria-label="Profile options">
          <div className="profile-menu-head">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <div className="profile-menu-status-row">
            <span>Current status</span>
            <strong>{presenceOptions.find((item) => item.value === currentPresence)?.label || 'Online'}</strong>
          </div>
          <button className="ghost profile-view-btn" type="button" onClick={() => { setOpen(false); navigate('/settings'); }}>
            View profile
          </button>
          <small className="profile-status-label">Change status</small>
          <div className="profile-presence-grid">
            {presenceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`ghost profile-presence-option ${currentPresence === option.value ? 'active' : ''}`}
                onClick={() => applyPresence(option.value)}
              >
                <span className={`presence-icon ${option.value.toLowerCase()}`} aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <div className="profile-menu-actions">
            <button className="ghost logout-btn" type="button" onClick={() => { setOpen(false); onLogout?.(); }}>Logout</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
