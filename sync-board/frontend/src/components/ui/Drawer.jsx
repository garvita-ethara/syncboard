import React from 'react';

export default function Drawer({ open, title, onClose, children, side = 'right' }) {
  if (!open) return null;
  return (
    <div className="ui-drawer-backdrop" onClick={onClose}>
      <aside className={`ui-drawer ui-drawer-${side}`} onClick={(event) => event.stopPropagation()}>
        <header className="ui-drawer-head">
          <h2>{title}</h2>
          <button className="ghost" type="button" onClick={onClose}>Close</button>
        </header>
        <div className="ui-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
