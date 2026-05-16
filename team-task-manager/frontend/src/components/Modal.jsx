import React from 'react';

export default function Modal({ open, title, onClose, children, action }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="ghost modal-close" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">{children}</div>
        {action && <div className="modal-actions">{action}</div>}
      </div>
    </div>
  );
}
