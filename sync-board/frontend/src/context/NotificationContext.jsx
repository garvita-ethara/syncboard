import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

function getStorageKeys(userId) {
  return {
    read: `sb_notifications_read_${userId}`,
    cleared: `sb_notifications_cleared_${userId}`
  };
}

function loadStoredSet(key) {
  if (typeof window === 'undefined') return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (_error) {
    return new Set();
  }
}

function saveStoredSet(key, set) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [clearedIds, setClearedIds] = useState(new Set());
  const api = useApi();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      setReadIds(new Set());
      setClearedIds(new Set());
      return;
    }
    const keys = getStorageKeys(user.id);
    setReadIds(loadStoredSet(keys.read));
    setClearedIds(loadStoredSet(keys.cleared));
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.get('/dashboard/recent-activity');
      const baseNotifications = (data.activities || []).map((item) => ({
        id: item.id,
        title: item.entityType ? `${String(item.entityType).replace(/_/g, ' ')}` : 'Activity',
        message: item.message,
        time: item.createdAt,
        type: item.action || 'ACTIVITY'
      }));

      const keys = getStorageKeys(user.id);
      const currentRead = loadStoredSet(keys.read);
      const currentCleared = loadStoredSet(keys.cleared);
      setReadIds(currentRead);
      setClearedIds(currentCleared);

      const visible = baseNotifications
        .filter((item) => !currentCleared.has(item.id))
        .map((item) => ({ ...item, read: currentRead.has(item.id) }));

      setNotifications(visible);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 60000); // Check every minute
    const onMutated = () => loadNotifications();
    window.addEventListener('app:data-mutated', onMutated);
    return () => {
      clearInterval(id);
      window.removeEventListener('app:data-mutated', onMutated);
    };
  }, [user]);

  const markAsRead = (id) => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveStoredSet(getStorageKeys(user.id).read, next);
      return next;
    });
  };

  const markAllAsRead = () => {
    if (!user?.id || notifications.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((item) => next.add(item.id));
      saveStoredSet(getStorageKeys(user.id).read, next);
      return next;
    });
  };

  const clearAll = () => {
    if (!user?.id || notifications.length === 0) return;
    setClearedIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((item) => next.add(item.id));
      saveStoredSet(getStorageKeys(user.id).cleared, next);
      return next;
    });
    setNotifications([]);
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll, refresh: loadNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
