import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import InlineMessage from '../components/InlineMessage';
import EmptyState from '../components/EmptyState';
import ClickableUser from '../components/ClickableUser';
import MemberEditModal from '../components/MemberEditModal';
import StateSkeleton from '../components/StateSkeleton';
import ErrorCard from '../components/ErrorCard';

function presenceClass(presence) {
  return `presence-dot ${String(presence || '').toLowerCase()}`;
}

export default function Members() {
  const api = useApi();
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editMember, setEditMember] = useState(null);
  const isAdmin = currentUser?.role === 'ADMIN';

  async function load() {
    try {
      setError('');
      const [usersData, projectsData] = await Promise.all([
        api.get('/users/team'),
        api.get('/projects')
      ]);

      const projectByUser = new Map();
      (projectsData.projects || []).forEach((project) => {
        (project.members || []).forEach((member) => {
          if (!projectByUser.has(member.user.id)) projectByUser.set(member.user.id, []);
          projectByUser.get(member.user.id).push(project.name);
        });
      });

      setMembers((usersData.users || []).map((member) => ({
        ...member,
        primaryTeam: (projectByUser.get(member.id) || [])[0] || '—'
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener('app:data-mutated', load);
    return () => window.removeEventListener('app:data-mutated', load);
  }, []);

  useEffect(() => {
    function onPresenceChanged(event) {
      const { userId, presence } = event.detail || {};
      if (!userId || !presence) return;
      setMembers((current) => current.map((member) => (
        member.id === userId ? { ...member, presence } : member
      )));
    }
    window.addEventListener('presence:changed', onPresenceChanged);
    return () => window.removeEventListener('presence:changed', onPresenceChanged);
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) =>
      member.name.toLowerCase().includes(q)
      || member.email.toLowerCase().includes(q)
      || String(member.primaryTeam).toLowerCase().includes(q)
    );
  }, [members, search]);

  if (error && !members.length && !loading) return <ErrorCard title="Unable to load members" message={error} onRetry={load} />;
  if (loading) return <StateSkeleton title="Members" kind="table" />;

  return (
    <section className="minimal-page">
      <PageHeader
        title="Members"
        action={(
          <input
            className="header-search"
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search members"
          />
        )}
      />
      <InlineMessage kind="error">{error}</InlineMessage>

      <div className="panel">
        {filteredMembers.length === 0 ? (
          <EmptyState title="No members" message="Try a different search." />
        ) : (
          <div className="table-wrap">
            <table className="minimal-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  {isAdmin ? <th className="col-actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="member-cell"><ClickableUser user={member} /></td>
                    <td><span className={`role-pill ${String(member.role).toLowerCase()}`}>{member.role}</span></td>
                    <td>{member.primaryTeam}</td>
                    <td><span className={presenceClass(member.presence)}>{member.presence}</span></td>
                    {isAdmin ? (
                      <td className="col-actions">
                        <button
                          className="primary compact-btn"
                          type="button"
                          onClick={() => setEditMember(member)}
                        >
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MemberEditModal
        open={Boolean(editMember)}
        member={editMember}
        onClose={() => setEditMember(null)}
        onSaved={load}
      />
    </section>
  );
}
