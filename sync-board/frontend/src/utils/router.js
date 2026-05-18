const NAVIGATION_EVENT = 'app:navigate';

export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function currentPath() {
  return normalizePath(window.location.pathname);
}

export function navigate(pathname, { replace = false } = {}) {
  const nextPath = normalizePath(pathname);
  const current = currentPath();

  if (current === nextPath) return;

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', nextPath);
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function subscribeToLocation(onChange) {
  const handler = () => onChange(currentPath());
  window.addEventListener('popstate', handler);
  window.addEventListener(NAVIGATION_EVENT, handler);

  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener(NAVIGATION_EVENT, handler);
  };
}
