import React, { useEffect } from 'react';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import Dashboard from './features/Dashboard';
import Projects from './features/Projects';
import Tasks from './features/Tasks';
import Team from './features/Team';
import Members from './features/Members';
import Users from './features/Users';
import Settings from './features/Settings';
import Unauthorized from './features/Unauthorized';
import ProfileMenu from './components/ProfileMenu';
import ProfileEditModal from './components/ProfileEditModal';
import UserProfilePanel from './components/UserProfilePanel';
import Navbar from './components/Navbar';
import { useToast } from './components/ui';
import { usePathname } from './hooks/usePathname';
import { navigate } from './utils/router';
import LoadingState from './components/LoadingState';
import { UserProfilePanelProvider } from './context/UserProfilePanelContext';
import { NotificationProvider } from './context/NotificationContext';
import { SearchProvider } from './context/SearchContext';

const PUBLIC_PATHS = new Set(['/login', '/signup']);
const PRIVATE_PATHS = new Set(['/dashboard', '/team', '/members', '/projects', '/tasks', '/reports', '/users', '/settings', '/unauthorized']);

function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname);
}

function isPrivatePath(pathname) {
  return PRIVATE_PATHS.has(pathname);
}

export default function App() {
  const { user, booting, logout } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return window.localStorage.getItem('ttm_theme') || 'system';
  });
  const [density, setDensity] = useState(() => {
    if (typeof window === 'undefined') return 'comfortable';
    return window.localStorage.getItem('ttm_density') || 'comfortable';
  });
  const [accent, setAccent] = useState(() => {
    if (typeof window === 'undefined') return '#346dff';
    return window.localStorage.getItem('ttm_accent') || '#346dff';
  });
  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [profilePanelUser, setProfilePanelUser] = useState(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else if (media.addListener) {
      media.addListener(listener);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else if (media.removeListener) {
        media.removeListener(listener);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ttm_theme', theme);
    }
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', density);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ttm_density', density);
    }
  }, [density]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--accent', accent);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ttm_accent', accent);
    }
  }, [accent]);

  useEffect(() => {
    if (booting) return;

    if (!user) {
      if (pathname === '/' || !isPublicPath(pathname)) {
        navigate('/login', { replace: true });
      }
      return;
    }

    if (pathname === '/' || isPublicPath(pathname) || !isPrivatePath(pathname)) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (pathname === '/users' && user.role !== 'ADMIN') {
      navigate('/unauthorized', { replace: true });
    }
  }, [booting, pathname, user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    toast?.pushToast({ type: 'success', title: 'Logged out', message: 'You have been signed out successfully.' });
  }

  if (booting) {
    return (
      <main className="auth-shell">
        <LoadingState title="Loading workspace" message="Restoring your secure session and preparing your dashboard." />
      </main>
    );
  }
  if (!user) return <AuthScreen mode={pathname === '/signup' ? 'signup' : 'login'} />;

  const nav = [
    ['/dashboard', 'Dashboard', 'M3 12h18M3 6h18M3 18h18'],
    ['/team', 'Teams', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16 0h4v-2a4 4 0 0 0-3-3.87m-3-9.13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm6 4a4 4 0 0 1-3 3.87'],
    ['/members', 'Members', 'M16 4h2a2 2 0 0 1 2 2v2M8 4H6a2 2 0 0 0-2 2v2m12 10h2a2 2 0 0 0 2-2v-2M8 20H6a2 2 0 0 1-2-2v-2M9 10h6m-6 4h6'],
    ['/projects', 'Projects', 'M3 7.5h18M3 12h18M3 16.5h18'],
    ['/tasks', 'Tasks', 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'],
    ['/settings', 'Settings', 'M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.44 7.44 0 0 0-.08-1l2.02-1.58-2-3.46-2.45.8a7.86 7.86 0 0 0-1.73-1l-.37-2.54h-4l-.37 2.54a7.86 7.86 0 0 0-1.73 1l-2.45-.8-2 3.46L4.68 11a7.44 7.44 0 0 0 0 2l-2.02 1.58 2 3.46 2.45-.8c.53.4 1.11.74 1.73 1l.37 2.54h4l.37-2.54c.62-.26 1.2-.6 1.73-1l2.45.8 2-3.46-2.02-1.58c.05-.33.08-.66.08-1Z']
  ];
  let content = <Dashboard />;
  if (pathname === '/projects') content = <Projects />;
  if (pathname === '/tasks') content = <Tasks />;
  if (pathname === '/team') content = <Team />;
  if (pathname === '/members') content = <Members />;
  if (pathname === '/users') content = user.role === 'ADMIN' ? <Users /> : <Unauthorized />;
  if (pathname === '/settings') {
    content = (
      <Settings
        theme={theme}
        resolvedTheme={resolvedTheme}
        setTheme={setTheme}
        density={density}
        setDensity={setDensity}
        accent={accent}
        setAccent={setAccent}
        onLogout={logout}
      />
    );
  }
  if (pathname === '/unauthorized') content = <Unauthorized />;

  return (
    <UserProfilePanelProvider value={{ openProfile: setProfilePanelUser }}>
      <NotificationProvider>
        <SearchProvider>
          <div className="app-shell">
            {sidebarOpen ? <button className="sidebar-overlay" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" /> : null}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
              <div className="brand-block">
                <div className="brand-content">
                  <div className="brand-logo-premium">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="brand-copy">
                    <strong>SyncBoard</strong>
                  </div>
                </div>
              </div>

              <nav className="sidebar-nav">
                {nav.map(([path, label, iconPath]) => (
                  <button key={path} className={pathname === path ? 'active' : ''} type="button" onClick={() => navigate(path)}>
                    <div className="nav-item-content">
                      <div className="nav-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={iconPath} />
                        </svg>
                      </div>
                      <span>{label}</span>
                    </div>
                  </button>
                ))}
              </nav>

              <div className="sidebar-footer">
                <ProfileMenu
                  user={user}
                  onOpenProfile={() => setProfileEditOpen(true)}
                  className="sidebar-profile-menu"
                  triggerClassName="sidebar-profile-trigger"
                />
              </div>
            </aside>

            <div className="workspace">
              <Navbar onMenuClick={() => setSidebarOpen(true)} />
              <main className="content content-shell">
                {content}
              </main>
            </div>
            <UserProfilePanel open={Boolean(profilePanelUser)} user={profilePanelUser} onClose={() => setProfilePanelUser(null)} />
            <ProfileEditModal
              open={profileEditOpen}
              onClose={() => setProfileEditOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </SearchProvider>
      </NotificationProvider>
    </UserProfilePanelProvider>
  );
}
