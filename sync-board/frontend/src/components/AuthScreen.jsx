import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../utils/router';
import InlineMessage from './InlineMessage';
import { useToast } from './ui';

export default function AuthScreen({ mode = 'login' }) {
  const { authenticate } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setFieldErrors({});
    setForm({ name: '', email: '', password: '' });
    setShowPassword(false);
  }, [mode]);

  function validate() {
    const nextErrors = {};

    if (mode === 'signup' && !form.name.trim()) {
      nextErrors.name = 'Please enter your full name.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!form.email.includes('@')) {
      nextErrors.email = 'Please include an "@" in the email address.';
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters long.';
    }

    return nextErrors;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setLoading(true);
    try {
      const body = mode === 'signup'
        ? form
        : { email: form.email, password: form.password };
      await authenticate(mode, body);
      toast?.pushToast({
        type: 'success',
        title: mode === 'login' ? 'Welcome back!' : 'Account created!',
        message: mode === 'login' ? 'Redirecting you to your dashboard...' : 'Let\'s get started with your workspace.'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-container">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <div className="auth-logo">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>SyncBoard</span>
            </div>
            <h1>The ultimate workspace for your team.</h1>
          </div>
          <div className="auth-visual-overlay"></div>
        </div>
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
            <p>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                className="link-btn"
                type="button"
                onClick={() => navigate(mode === 'login' ? '/signup' : '/login')}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <InlineMessage kind="error">{error}</InlineMessage>

          <form onSubmit={submit} className="auth-form" noValidate>
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  placeholder="John Doe"
                  value={form.name}
                  className={fieldErrors.name ? 'is-invalid' : ''}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setFieldErrors((current) => ({ ...current, name: '' }));
                  }}
                />
                {fieldErrors.name && <span className="error-text">{fieldErrors.name}</span>}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                className={fieldErrors.email ? 'is-invalid' : ''}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setFieldErrors((current) => ({ ...current, email: '' }));
                }}
              />
              {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  className={fieldErrors.password ? 'is-invalid' : ''}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    setFieldErrors((current) => ({ ...current, password: '' }));
                  }}
                />
                <button 
                  className="password-toggle-eye" 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11-8 11-8-4-8-11-8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <span className="error-text">{fieldErrors.password}</span>}
            </div>

            <button className="submit-btn" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                mode === 'login' ? 'Sign in to workspace' : 'Create workspace account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>© 2026 SyncBoard. All rights reserved.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
