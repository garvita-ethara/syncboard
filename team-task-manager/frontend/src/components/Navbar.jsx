import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserProfilePanel } from '../context/UserProfilePanelContext';
import { useNotifications } from '../context/NotificationContext';
import { useSearch } from '../context/SearchContext';
import { dateLabel } from '../utils/dateUtils';
import { navigate } from '../utils/router';

export default function Navbar({ onMobileMenu }) {
  const { user } = useAuth();
  const { openProfile } = useUserProfilePanel();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'User';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <nav className="top-navbar">
      <div className="navbar-left">
        <button className="mobile-menu-btn" onClick={onMobileMenu}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="welcome-greeting">
          <h1>Welcome back, {firstName}</h1>
          <p className="muted">Manage your tasks, projects and team efficiently. • {today}</p>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="nav-notif-wrap">
          <button 
            className={`nav-icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`} 
            title="Notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            </svg>
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className="notif-dropdown panel">
              <div className="notif-head">
                <h3>Notifications</h3>
                <div className="notif-actions">
                  <button className="text-btn">Mark all read</button>
                  <button className="text-btn">Clear</button>
                </div>
              </div>
              <div className="notif-list">
                {notifications.length ? notifications.map(n => (
                  <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`} onClick={() => markAsRead(n.id)}>
                    <div className="notif-dot" />
                    <div className="notif-content">
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                      <small>{dateLabel(n.time)}</small>
                    </div>
                  </div>
                )) : (
                  <div className="notif-empty">No new notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="primary quick-add-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>New Task</span>
        </button>
      </div>
    </nav>
  );
}
