import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import EmptyState from '../components/EmptyState';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

function buildLinePath(points, width = 100, height = 40) {
  if (points.length < 2) return '';
  const max = Math.max(1, ...points.map((point) => point.value));
  const step = width / (points.length - 1);

  return points.map((point, index) => {
    const x = index * step;
    const y = height - ((point.value || 0) / max) * height;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

function buildAreaPath(points, width = 100, height = 40) {
  const line = buildLinePath(points, width, height);
  if (!line) return '';
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function buildDonutSegments(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 0;

  return items.map((item, index) => {
    const length = (item.value / total) * 100;
    const segment = {
      ...item,
      color: `var(--chart-${(index % 5) + 1})`,
      dasharray: `${length} ${100 - length}`,
      dashoffset: `${25 - offset}`
    };
    offset += length;
    return segment;
  });
}

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
        if (mounted) setData(next);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted && isInitial) setLoading(false);
      }
    }

    load(true);
    const id = setInterval(() => load(false), 30000);
    const onMutated = () => load(false);
    window.addEventListener('app:data-mutated', onMutated);

    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener('app:data-mutated', onMutated);
    };
  }, [api]);

  if (error && !data) return <ErrorCard title="Sync Failed" message={error} onRetry={() => window.location.reload()} />;
  if (loading || !data) return <StateSkeleton title="Preparing Insights..." kind="cards" />;

  const isAdmin = data?.dashboardRole === 'ADMIN';
  const cards = data?.cards || {};
  const completionRate = (cards.totalTasks || 0) > 0 ? Math.round(((cards.completedTasks || 0) / (cards.totalTasks || 0)) * 100) : 0;
  const dailyCompletion = data?.charts?.dailyCompletion || [];
  const teamPerformance = (data?.charts?.teamPerformance || []).slice(0, 5);
  const taskAllocation = (data?.charts?.taskAllocation || []).slice(0, 5);
  const membersByTeam = teamPerformance.map((team) => ({ label: team.name, value: team.memberCount || 0 }));
  const completedByTeam = teamPerformance.map((team) => ({ label: team.name, value: team.completedTasks || 0, rate: team.completionRate || 0 }));
  const lineSeries = dailyCompletion.map((item) => ({ label: item.date.slice(5), value: item.count || 0 }));
  const donutSegments = buildDonutSegments(membersByTeam.length ? membersByTeam : [{ label: 'No Team', value: 1 }]);
  const maxCompletedByTeam = Math.max(1, ...completedByTeam.map((item) => item.value));
  const maxAllocation = Math.max(1, ...taskAllocation.map((item) => item.count));
  const maxDaily = Math.max(1, ...dailyCompletion.map((item) => item.count));
  const outstandingTasks = Math.max(0, (cards.totalTasks || 0) - (cards.completedTasks || 0));

  const statCards = [
    {
      label: isAdmin ? 'Work Items' : 'My Tasks',
      value: cards.totalTasks || 0,
      trend: '+5',
      trendLabel: 'Last 7 days',
      caption: 'Daily completed tasks',
      viz: 'line'
    },
    {
      label: isAdmin ? 'Completed' : 'Done',
      value: cards.completedTasks || 0,
      trend: `+${completionRate}%`,
      trendLabel: 'Completion rate',
      caption: 'Team members by team',
      viz: 'donut'
    },
    {
      label: isAdmin ? 'In Execution' : 'Active',
      value: cards.inProgressTasks || 0,
      trend: `${cards.inProgressTasks || 0}`,
      trendLabel: 'Currently moving',
      caption: 'Task spikes per assignee',
      viz: 'spike'
    },
    {
      label: isAdmin ? 'Delayed' : 'Overdue',
      value: cards.overdueTasks || 0,
      trend: (cards.overdueTasks || 0) > 0 ? 'Alert' : 'Clear',
      trendLabel: 'Needs focus',
      caption: 'Completed tasks by team',
      viz: 'bar',
      danger: (cards.overdueTasks || 0) > 0
    }
  ];

  function renderCardViz(viz) {
    if (viz === 'line') {
      return (
        <div className="mini-chart mini-line-chart">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d={buildAreaPath(lineSeries)} className="mini-area-path" />
            <path d={buildLinePath(lineSeries)} className="mini-line-path" />
          </svg>
          <div className="mini-chart-meta">
            {lineSeries.map((point) => (
              <span key={point.label}>{point.value}</span>
            ))}
          </div>
        </div>
      );
    }

    if (viz === 'donut') {
      return (
        <div className="mini-chart mini-donut-chart">
          <div className="mini-donut-wrap">
            <svg viewBox="0 0 42 42" className="mini-donut">
              <circle className="mini-donut-track" cx="21" cy="21" r="15.915" />
              {donutSegments.map((segment) => (
                <circle
                  key={segment.label}
                  className="mini-donut-segment"
                  cx="21"
                  cy="21"
                  r="15.915"
                  style={{ stroke: segment.color, strokeDasharray: segment.dasharray, strokeDashoffset: segment.dashoffset }}
                />
              ))}
            </svg>
            <strong>{membersByTeam.reduce((sum, item) => sum + item.value, 0)}</strong>
          </div>
          <div className="mini-legend">
            {donutSegments.slice(0, 3).map((segment) => (
              <span key={segment.label}>
                <i style={{ background: segment.color }} />
                {segment.label}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (viz === 'spike') {
      const spikeItems = (taskAllocation.length ? taskAllocation : lineSeries).slice(0, 5);
      const maxValue = taskAllocation.length ? maxAllocation : maxDaily;
      return (
        <div className="mini-chart mini-spike-chart">
          {spikeItems.map((item) => (
            <div key={item.label || item.name} className="mini-spike-col">
              <div className="mini-spike-track">
                <div
                  className="mini-spike-bar"
                  style={{ height: `${Math.max(14, (((item.count ?? item.value) || 0) / maxValue) * 100)}%` }}
                />
              </div>
              <span>{(item.name || item.label).slice(0, 3)}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="mini-chart mini-bar-chart">
        {completedByTeam.slice(0, 4).map((item) => (
          <div key={item.label} className="mini-bar-row">
            <span>{item.label}</span>
            <div className="mini-bar-track">
              <i style={{ width: `${(item.value / maxCompletedByTeam) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="content-shell dashboard-page">
      <div className="content-container">
        <div className="stats-grid">
          {statCards.map((card, index) => (
            <div key={card.label} className={`stat-card chart-stat-card ${card.danger ? 'danger' : ''}`}>
              <div className="stat-card-top">
                <div className="stat-icon">
                  {index === 0 && <svg viewBox="0 0 24 24"><path d="M4 16l4-5 4 3 6-8" /></svg>}
                  {index === 1 && <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M13 3a9 9 0 0 1 8 8h-8z" /></svg>}
                  {index === 2 && <svg viewBox="0 0 24 24"><path d="M6 20V9M12 20V4M18 20v-7" /></svg>}
                  {index === 3 && <svg viewBox="0 0 24 24"><path d="M5 19h14M7 16l3-4 3 2 4-6" /></svg>}
                </div>
                <div className={`stat-trend ${card.danger ? 'down' : 'up'}`}>{card.trend}</div>
              </div>
              <div className="stat-body">
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
              {renderCardViz(card.viz)}
              <div className="stat-footer">
                <div className="stat-caption">{card.caption}</div>
                <div className="stat-trend-label">{card.trendLabel}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-analytics-grid">
          <div className="panel productivity-panel">
            <div className="panel-heading">
              <div>
                <h2>Daily Productivity Trend</h2>
                <p className="muted">Total task done per day across the last 7 days.</p>
              </div>
            </div>
            <div className="productivity-chart-wrap">
              <svg width="100%" height="100%" viewBox="0 0 1000 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={buildAreaPath(lineSeries, 1000, 180)} fill="url(#chartGradient)" />
                <path d={buildLinePath(lineSeries, 1000, 180)} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="chart-axis-labels">
                {lineSeries.map((point) => <span key={point.label}>{point.label}</span>)}
              </div>
            </div>
          </div>

          <div className="panel dashboard-pie-panel">
            <div className="panel-heading">
              <div>
                <h2>Team Members by Team</h2>
                <p className="muted">Pie view of member distribution across active teams.</p>
              </div>
            </div>
            {membersByTeam.length ? (
              <div className="dashboard-pie-layout">
                <div className="dashboard-pie-wrap">
                  <svg viewBox="0 0 42 42" className="dashboard-donut">
                    <circle className="mini-donut-track" cx="21" cy="21" r="15.915" />
                    {donutSegments.map((segment) => (
                      <circle
                        key={segment.label}
                        className="mini-donut-segment"
                        cx="21"
                        cy="21"
                        r="15.915"
                        style={{ stroke: segment.color, strokeDasharray: segment.dasharray, strokeDashoffset: segment.dashoffset }}
                      />
                    ))}
                  </svg>
                  <div className="dashboard-donut-center">
                    <strong>{membersByTeam.reduce((sum, item) => sum + item.value, 0)}</strong>
                    <span>Members</span>
                  </div>
                </div>
                <div className="dashboard-legend-list">
                  {donutSegments.map((segment) => (
                    <div key={segment.label} className="dashboard-legend-item">
                      <div className="dashboard-legend-swatch" style={{ background: segment.color }} />
                      <span>{segment.label}</span>
                      <strong>{segment.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No team data yet" message="Create projects with teams to see the member breakdown." />
            )}
          </div>
        </div>

        <div className="dashboard-main-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Task Allocation by Member</h2>
                <p className="muted">Spike chart showing current workload distribution per assignee.</p>
              </div>
            </div>
            <div className="spike-chart-container dashboard-spike-panel">
              {taskAllocation.length ? taskAllocation.map((item) => (
                <div key={item.name} className="spike-bar-wrap">
                  <div className="spike-value">{item.count}</div>
                  <div
                    className="spike-bar"
                    style={{ height: `${Math.max(18, ((item.count || 0) / maxAllocation) * 160)}px` }}
                  />
                  <span className="spike-label">{item.name.split(' ')[0].slice(0, 6)}</span>
                </div>
              )) : (
                <EmptyState title="No allocation data yet" message="Assigned tasks will appear here as spikes." />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Completed Tasks by Team</h2>
                <p className="muted">Bar graph of output by team, with completion rate context.</p>
              </div>
            </div>
            <div className="team-bar-list">
              {completedByTeam.length ? completedByTeam.map((item) => (
                <div key={item.label} className="team-bar-row">
                  <div className="team-bar-head">
                    <strong>{item.label}</strong>
                    <span>{item.value} done</span>
                  </div>
                  <div className="team-bar-track">
                    <i style={{ width: `${(item.value / maxCompletedByTeam) * 100}%` }} />
                  </div>
                  <small>{item.rate}% completion rate</small>
                </div>
              )) : (
                <EmptyState title="No team output yet" message="Completed tasks by team will appear here." />
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-main-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Project Throughput</h2>
                <p className="muted">Delivery progress across your active pipeline.</p>
              </div>
            </div>
            <div className="allocation-list dashboard-progress-list">
              {(isAdmin ? data.projectProgress : data.memberProjects || []).length ? (isAdmin ? data.projectProgress : data.memberProjects).slice(0, 6).map((project) => (
                <div key={project.id} className="allocation-row dashboard-progress-row">
                  <div className="dashboard-progress-head">
                    <strong>{project.name}</strong>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="allocation-bar-bg">
                    <div className="allocation-bar-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                  <small>{project.team || 'General'} team</small>
                </div>
              )) : (
                <EmptyState title="No active projects" message="Start by creating a project and adding tasks." />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Workspace Health</h2>
                <p className="muted">A quick read on how the workspace is performing today.</p>
              </div>
            </div>
            <div className="dashboard-health-stack">
              <div className="dashboard-health-card">
                <span className="muted">Completion Efficiency</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className="dashboard-health-card">
                <span className="muted">Open Items</span>
                <strong>{outstandingTasks}</strong>
              </div>
              <div className="dashboard-health-card">
                <span className="muted">Logged In User</span>
                <strong>{user?.name || 'Workspace User'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
