import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('smartcrm_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('smartcrm_token');
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('smartcrm_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('smartcrm_token');
        localStorage.removeItem('smartcrm_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persistSession = (token, userData) => {
    localStorage.setItem('smartcrm_token', token);
    localStorage.setItem('smartcrm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    persistSession(data.token, data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    persistSession(data.token, data.user);
    return data.user;
  }, []);

  const demoLogin = useCallback(async () => {
    const { data } = await authApi.demo();
    persistSession(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('smartcrm_token');
    localStorage.removeItem('smartcrm_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
