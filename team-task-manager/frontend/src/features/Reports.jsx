import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';
import InlineMessage from '../components/InlineMessage';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

export default function Reports() {
  const api = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const next = await api.get('/dashboard');
        if (mounted) setData(next);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [api]);

  if (error && !data && !loading) return <ErrorCard title="Unable to load reports" message={error} onRetry={() => window.location.reload()} />;
  if (loading) return <StateSkeleton title="Reports" kind="cards" />;

  const cards = data?.cards || {};

  return (
    <section>
      <PageHeader
        title="Reports"
        description="Operational summaries for projects, tasks, and delivery progress."
      />
      <InlineMessage kind="error">{error}</InlineMessage>

      <div className="stats-grid projects-summary-grid">
        <div className="stat-card"><span>Total Projects</span><strong>{cards.totalProjects || 0}</strong></div>
        <div className="stat-card"><span>Total Tasks</span><strong>{cards.totalTasks || 0}</strong></div>
        <div className="stat-card"><span>Completed Tasks</span><strong>{cards.completedTasks || 0}</strong></div>
        <div className="stat-card"><span>Overdue Tasks</span><strong>{cards.overdueTasks || 0}</strong></div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Summary</h2>
        </div>
        <p className="muted">Use this space for periodic exports, team KPIs, and performance snapshots.</p>
      </div>
    </section>
  );
}
