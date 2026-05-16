import React from 'react';
import PageHeader from '../components/PageHeader';

export default function HelpAbout() {
  return (
    <section>
      <PageHeader title="Help & About" description="SyncBoard internal knowledge and support entrypoint." />
      <div className="panel">
        <h2>About SyncBoard</h2>
        <p className="muted">SyncBoard helps teams plan projects, assign tasks, and collaborate with role-based controls and live presence.</p>
      </div>
      <div className="panel">
        <h2>Need help?</h2>
        <p className="muted">Contact your workspace administrator for access, password reset, and account support.</p>
      </div>
    </section>
  );
}
