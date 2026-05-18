import React from 'react';

export default function PageHeader({ title, description, action, eyebrow = null, toolsOnly = false }) {
  if (toolsOnly) {
    return (
      <header className="page-header page-header-minimal page-header-tools-only">
        {action}
      </header>
    );
  }

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
