import React from 'react';
import Modal from './Modal';
import ReadOnlyField from './ReadOnlyField';

function initialsFromName(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SB';
}

export default function UserProfilePanel({ open, user, onClose }) {
  if (!open || !user) return null;

  const initials = user.avatarInitials || initialsFromName(user.name);

  return (
    <Modal open={open} title={user.name || 'Member'} onClose={onClose}>
      <div className="user-profile-modal minimal-profile">
        <div className="profile-menu-head">
          <span className="avatar avatar-lg">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <p className="muted">{user.email}</p>
          </div>
        </div>
        <ReadOnlyField label="Role" value={user.role} />
        <ReadOnlyField label="Status" value={user.presence || 'AWAY'} />
        {user.primaryTeam ? <ReadOnlyField label="Team" value={user.primaryTeam} /> : null}
      </div>
    </Modal>
  );
}
