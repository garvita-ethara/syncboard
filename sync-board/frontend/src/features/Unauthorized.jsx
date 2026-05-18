import React from 'react';
import { navigate } from '../utils/router';

export default function Unauthorized() {
  return (
    <section className="panel unauthorized-panel">
      <h1>Access Restricted</h1>
      <p className="muted">You do not have permission to access this page. Please contact an administrator if you need access.</p>
      <div className="split-actions">
        <button className="primary" type="button" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    </section>
  );
}
