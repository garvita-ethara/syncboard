import React, { useMemo, useState } from 'react';
import Input from './Input';

function strengthLabel(value) {
  if (!value) return '';
  let score = 0;
  if (value.length >= 6) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return 'Weak password';
  if (score <= 3) return 'Medium strength';
  return 'Strong password';
}

export default function PasswordInput({ showStrength = false, value = '', ...props }) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => strengthLabel(String(value || '')), [value]);

  return (
    <div className="ui-password-wrap">
      <Input {...props} value={value} type={visible ? 'text' : 'password'} />
      <button className="ui-password-toggle" type="button" onClick={() => setVisible((current) => !current)}>
        {visible ? 'Hide' : 'Show'}
      </button>
      {showStrength && value ? <small className="ui-password-strength">{strength}</small> : null}
    </div>
  );
}
