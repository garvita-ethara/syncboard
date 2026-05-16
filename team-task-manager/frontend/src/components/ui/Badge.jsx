import React from 'react';

export default function Badge({ type = 'status', tone = 'default', children }) {
  return <span className={`ui-badge ${type} ${tone}`}>{children}</span>;
}
