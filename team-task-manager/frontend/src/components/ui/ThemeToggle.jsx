import React from 'react';

export default function ThemeToggle({ theme = 'light', onToggle }) {
  const dark = theme === 'dark';
  return (
    <button className={`ui-theme-toggle ${dark ? 'dark' : 'light'}`} type="button" onClick={onToggle} aria-label="Toggle theme">
      <span className="ui-theme-track">
        <span className="ui-theme-thumb" />
      </span>
      <span>{dark ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
}
