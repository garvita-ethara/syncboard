import React from 'react';

export default function Card({ children, className = '' }) {
  return <div className={`panel ui-card ${className}`.trim()}>{children}</div>;
}
