import React from 'react';

export default function Input({ label, error = '', success = '', className = '', ...props }) {
  const stateClass = error ? 'is-error' : success ? 'is-success' : '';
  return (
    <label className={`ui-field ${className}`.trim()}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      <input {...props} className={`ui-input ${stateClass}`.trim()} />
      {error ? <small className="ui-field-error">{error}</small> : null}
      {!error && success ? <small className="ui-field-success">{success}</small> : null}
    </label>
  );
}
