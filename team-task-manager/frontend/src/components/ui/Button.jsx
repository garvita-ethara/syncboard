import React from 'react';

export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`ui-btn ui-btn-${variant} ${loading ? 'is-loading' : ''} ${className}`.trim()}
    >
      {loading ? <span className="ui-btn-spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
