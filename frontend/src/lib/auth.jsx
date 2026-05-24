import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gradeai_user') || 'null');
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('gradeai_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); }
      catch { setUser(null); }
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,

    // ── Login — calls real backend ──────────────────────────────────────────
    async login(email, password, role) {
      setLoading(true);
      try {
        const res = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = res.data;
        localStorage.setItem('gradeai_token', access_token);
        localStorage.setItem('gradeai_user', JSON.stringify(userData));
        setUser(userData);
        return userData;
      } finally {
        setLoading(false);
      }
    },

    // ── Bootstrap — creates first user via backend ──────────────────────────
    async bootstrap(payload, type) {
      setLoading(true);
      try {
        const endpoint = type === 'gog'
          ? '/auth/bootstrap-gog'
          : '/auth/bootstrap-super-admin';
        const res = await api.post(endpoint, payload);
        return res.data;
      } finally {
        setLoading(false);
      }
    },

    // ── Logout ──────────────────────────────────────────────────────────────
    logout() {
      localStorage.removeItem('gradeai_token');
      localStorage.removeItem('gradeai_user');
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function roleHome(role) {
  if (role === 'gog')         return '/gog/dashboard';
  if (role === 'super_admin') return '/super-admin/dashboard';
  if (role === 'admin')       return '/admin/dashboard';
  if (role === 'evaluator')   return '/evaluator/dashboard';
  return '/login';
}