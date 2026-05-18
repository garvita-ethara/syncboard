import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import { TOKEN_KEY } from '../constants';

const AuthContext = createContext(null);

function getStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
  }

  return window.localStorage.getItem('ttm_persist') === 'true' ? window.localStorage : window.sessionStorage;
}

export function AuthProvider({ children }) {
  const storage = getStorage();
  const [token, setToken] = useState(() => storage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  async function loadMe(activeToken = token) {
    if (!activeToken) {
      setUser(null);
      setBooting(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me', { token: activeToken });
      setUser(data.user);
    } catch (_error) {
      storage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      loadMe(token);
    }, 15000);
    return () => clearInterval(id);
  }, [token]);

  async function authenticate(mode, form) {
    const data = await apiRequest(`/auth/${mode}`, { method: 'POST', body: form });
    const persist = mode === 'login' ? Boolean(form.rememberMe) : false;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ttm_persist', String(persist));
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      const targetStorage = persist ? window.localStorage : window.sessionStorage;
      targetStorage.setItem(TOKEN_KEY, data.token);
    } else {
      storage.setItem(TOKEN_KEY, data.token);
    }
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    if (token) {
      try {
        await apiRequest('/auth/logout', { token, method: 'POST' });
      } catch (_error) {
        // Clear local auth state even if the token is already invalid or the request fails.
      }
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem('ttm_persist');
    } else {
      storage.removeItem(TOKEN_KEY);
    }
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, booting, authenticate, logout, reloadUser: loadMe }), [token, user, booting]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
