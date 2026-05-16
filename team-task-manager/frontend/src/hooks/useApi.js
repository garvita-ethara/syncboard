import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

export function useApi() {
  const { token, logout } = useAuth();

  async function request(path, options) {
    try {
      const response = await apiRequest(path, { token, ...options });
      if (options?.method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method)) {
        window.dispatchEvent(new Event('app:data-mutated'));
      }
      return response;
    } catch (error) {
      if (error?.status === 401) {
        logout();
      }
      throw error;
    }
  }

  return useMemo(() => ({
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    delete: (path) => request(path, { method: 'DELETE' })
  }), [token, logout]);
}
