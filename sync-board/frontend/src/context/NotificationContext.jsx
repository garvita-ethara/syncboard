import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const api = useApi();
  const { user } = useAuth();

  const loadNotifications = async () => {
    if (!user) return;
    try {
      // In a real app, we'd have a specific notification endpoint
      // For MVP, we'll use recent activity as notifications
      const data = await api.get('/dashboard');
      const mockNotifications = data.recentTasks.map(task => ({
        id: task.id,
        title: 'Task Update',
        message: `Task "${task.title}" was updated recently.`,
        time: task.updatedAt,
        read: false,
        type: 'TASK'
      }));
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 60000); // Check every minute
    return () => clearInterval(id);
  }, [user]);

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, refresh: loadNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
