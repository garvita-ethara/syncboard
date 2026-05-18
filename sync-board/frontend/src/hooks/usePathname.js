import { useEffect, useState } from 'react';
import { currentPath, subscribeToLocation } from '../utils/router';

export function usePathname() {
  const [pathname, setPathname] = useState(() => currentPath());

  useEffect(() => subscribeToLocation(setPathname), []);

  return pathname;
}
