import React from 'react';

export default function PageHeader({ title, description, action, eyebrow = null }) {
  return (
    <header className="page-header page-header-minimal">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="muted page-header-desc">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
