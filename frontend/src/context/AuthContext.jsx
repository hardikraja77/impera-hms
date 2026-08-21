import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const ROLE_DASHBOARDS = {
  admin: '/admin',
  doctor: '/doctor',
  receptionist: '/receptionist',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('tokenExpiresAt');

    if (token) {
      // Check if token is expired
      if (expiresAt && new Date(expiresAt) < new Date()) {
        // Token expired, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');
        setLoading(false);
        return;
      }

      setTokenExpiresAt(expiresAt);

      api.get('/user')
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiresAt');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, role) => {
    const res = await api.post('/login', { email, password, role });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));

    if (res.data.expires_at) {
      localStorage.setItem('tokenExpiresAt', res.data.expires_at);
      setTokenExpiresAt(res.data.expires_at);
    }

    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiresAt');
    setTokenExpiresAt(null);
    setUser(null);
  };

  const logoutAll = async () => {
    try {
      await api.post('/logout-all');
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiresAt');
    setTokenExpiresAt(null);
    setUser(null);
  };

  // Check if token is about to expire (within 10 minutes)
  const isTokenExpiringSoon = useCallback(() => {
    if (!tokenExpiresAt) return false;
    const expiry = new Date(tokenExpiresAt);
    const now = new Date();
    const tenMinutes = 10 * 60 * 1000;
    return expiry - now < tenMinutes && expiry - now > 0;
  }, [tokenExpiresAt]);

  const getDashboardUrl = () => {
    if (!user) return '/';
    return ROLE_DASHBOARDS[user.role] || '/';
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      logoutAll,
      loading,
      getDashboardUrl,
      tokenExpiresAt,
      isTokenExpiringSoon,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
