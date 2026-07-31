import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as logoutApi } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await getMe();
      if (data.success) {
        setUser(data.data);
        setIsAuthenticated(true);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for auth expiry events from axios interceptor
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = (userData) => {
    if (userData?.token) {
      localStorage.setItem('tms_token', userData.token);
    }
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {}
    localStorage.removeItem('tms_token');
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout, updateUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
