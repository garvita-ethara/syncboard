import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Stat from '../components/Stat';
import { priorityOptions, statusOptions } from '../constants';
import { dateLabel, formatStatus } from '../utils/dateUtils';
import EmptyState from '../components/EmptyState';
import InlineMessage from '../components/InlineMessage';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

export default function Dashboard() {
  const api = useApi();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(isInitial = false) {
      if (isInitial) setLoading(true);
      try {
        setError('');
        const next = await api.get('/dashboard');
        if (mounted) {
          setData(next);
          setError(''); // Clear error on success
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted && isInitial) setLoading(false);
      }
    }
    load(true);
    const id = setInterval(() => load(false), 30000); // Reduced frequency for stability
    const onMutated = () => load(false);
    window.addEventListener('app:data-mutated', onMutated);
    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener('app:data-mutated', onMutated);
    };
  }, [api]);

  const isAdmin = data?.dashboardRole === 'ADMIN';
  const cards = data?.cards || {};
  const presence = data?.teamPresence || { ACTIVE: 0, IDLE: 0, AWAY: 0, DND: 0 };
  const totalMembers = (presence.ACTIVE || 0) + (presence.IDLE || 0) + (presence.AWAY || 0) + (presence.DND || 0);
  const completionRate = (cards.totalTasks || 0) > 0 ? Math.round(((cards.completedTasks || 0) / (cards.totalTasks || 0)) * 100) : 0;

  const statusEntries = useMemo(() => {
    if (!data) return [];
    const source = isAdmin ? data.charts.status : data.charts.myStatus;
    return statusOptions.map((status) => [status, source?.[status] || 0]);
  }, [data, isAdmin]);

  const priorityEntries = useMemo(() => {
    if (!data || !isAdmin) return [];
    return priorityOptions.map((priority) => [priority, data.charts.priority?.[priority] || 0]);
  }, [data, isAdmin]);

  const projectProgressEntries = useMemo(() => {
    if (!data) return [];
    const source = isAdmin ? data.projectProgress : data.memberProjects;
    return (source || []).slice(0, 6);
  }, [data, isAdmin]);

  const taskAllocation = data?.charts?.taskAllocation || [];
  const dailyCompletion = data?.charts?.dailyCompletion || [];

  const maxAllocation = Math.max(1, ...taskAllocation.map((a) => a.count));
  const maxDaily = Math.max(1, ...dailyCompletion.map((d) => d.count));

  // Generate SVG Path for Line Graph
  const generatePath = () => {
    if (dailyCompletion.length < 2) return '';
    const width = 1000;
    const height = 200;
    const step = width / (dailyCompletion.length - 1);
    
    return dailyCompletion.map((d, i) => {
      const x = i * step;
      const y = height - (d.count / maxDaily) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const generateAreaPath = () => {
    const linePath = generatePath();
    if (!linePath) return '';
    return `${linePath} L 1000 200 L 0 200 Z`;
  };

  const statCards = isAdmin
    ? [
        { label: 'Work Items', value: cards.totalTasks || 0, trend: '+5', trendLabel: 'vs yesterday', caption: 'Total pipeline' },
        { label: 'Completed', value: cards.completedTasks || 0, trend: '+12%', trendLabel: 'this week', caption: `${completionRate}% throughput` },
        { label: 'In Execution', value: cards.inProgressTasks || 0, trend: '8', trendLabel: 'Active items', caption: 'Current velocity' },
        { label: 'Delayed', value: cards.overdueTasks || 0, trend: cards.overdueTasks > 0 ? 'Urgent' : 'On Track', trendLabel: 'Needs focus', danger: (cards.overdueTasks || 0) > 0 }
      ]
    : [
        { label: 'My Tasks', value: cards.totalTasks || 0, trend: '+3', trendLabel: 'Assigned today', caption: 'Total personal items' },
        { label: 'Done', value: cards.completedTasks || 0, trend: '+18%', trendLabel: 'Efficiency', caption: `${completionRate}% completion` },
        { label: 'Active', value: cards.inProgressTasks || 0, trend: '8', trendLabel: 'In progress', caption: 'Work in execution' },
        { label: 'Overdue', value: cards.overdueTasks || 0, trend: cards.overdueTasks > 0 ? 'Delayed' : 'Clear', trendLabel: 'Past due', danger: (cards.overdueTasks || 0) > 0 }
      ];

  if (error && !data) return <ErrorCard title="Sync Failed" message={error} onRetry={() => window.location.reload()} />;
  if (loading || !data) return <StateSkeleton title="Preparing Insights..." kind="cards" />;

  return (
    <section className="content-shell dashboard-page">
      <div className="content-container">
        <div className="stats-grid">
          {statCards.map((card, i) => (
            <div key={i} className={`stat-card ${card.danger ? 'danger' : ''}`}>
              <div className="stat-card-top">
                <div className="stat-icon">
                  {i === 0 && <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                  {i === 1 && <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                  {i === 2 && <svg viewBox="0 0 24 24"><path d="M12 20v-6M6 20V10M18 20V4" /></svg>}
                  {i === 3 && <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                </div>
                <div className={`stat-trend ${card.trend.includes('+') ? 'up' : 'down'}`}>
                  {card.trend}
                </div>
              </div>
              <div className="stat-body">
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
              <div className="stat-footer">
                <div className="stat-caption">{card.caption}</div>
                <div className="stat-trend-label">{card.trendLabel}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="panel productivity-panel">
          <div className="panel-heading">
            <div>
              <h2>Daily Productivity Trend</h2>
              <p className="muted">Visualize your team's output across the last 14 days.</p>
            </div>
          </div>
          <div className="productivity-chart-wrap" style={{ height: 240, position: 'relative', marginTop: 24 }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={generateAreaPath()} fill="url(#chartGradient)" />
              <path d={generatePath()} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="dashboard-main-grid">
          <div className="panel">
            <div className="panel-heading">
              <h2>Project Throughput</h2>
              <p className="muted">Delivery progress across your active pipeline.</p>
            </div>
            <div className="allocation-list" style={{ marginTop: 24 }}>
              {projectProgressEntries.length ? projectProgressEntries.map((project) => (
                <div key={project.id} className="allocation-row" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ fontSize: 14 }}>{project.name}</strong>
                    <span style={{ fontWeight: 600 }}>{project.progress}%</span>
                  </div>
                  <div className="allocation-bar-bg" style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      className="allocation-bar-fill" 
                      style={{ width: `${project.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} 
                    />
                  </div>
                </div>
              )) : (
                <EmptyState title="No active projects" message="Start by creating a project and adding tasks." />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Workspace Health</h2>
              <span className="status-pill active">Optimal</span>
            </div>
            <p className="muted" style={{ marginTop: 8, marginBottom: 32 }}>
              Your workspace is performing at {completionRate}% efficiency. 
              Focus on the {cards.overdueTasks} delayed items to maintain high velocity.
            </p>
            <div className="dashboard-rate-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="detail-stat" style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border)' }}>
                <span className="muted">Open Items</span>
                <strong style={{ fontSize: 24, display: 'block', marginTop: 8 }}>{cards.totalTasks - cards.completedTasks}</strong>
              </div>
              <div className="detail-stat" style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid var(--border)' }}>
                <span className="muted">Completed</span>
                <strong style={{ fontSize: 24, display: 'block', marginTop: 8 }}>{cards.completedTasks}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
