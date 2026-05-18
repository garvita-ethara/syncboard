import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function Select({ label, options = [], value, onChange, placeholder = 'Select', className = '' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);

  useEffect(() => {
    function onDocClick(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <label className={`ui-field ${className}`.trim()}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      <div className="ui-select" ref={wrapRef}>
        <button className="ui-select-trigger" type="button" onClick={() => setOpen((current) => !current)}>
          <span>{selected?.label || placeholder}</span>
          <span className="ui-select-caret" />
        </button>
        {open ? (
          <div className="ui-select-menu">
            {options.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`ui-select-option ${item.value === value ? 'active' : ''}`}
                onClick={() => {
                  onChange?.(item.value);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  );
}
