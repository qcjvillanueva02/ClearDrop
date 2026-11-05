import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cleardrop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const token = localStorage.getItem('cleardrop_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await authApi.status();
        if (result && result.authenticated) {
          const userData = {
            username: result.username,
            displayName: result.displayName || result.username,
            role: result.role,
            userId: result.userId
          };
          setUser(userData);
          localStorage.setItem('cleardrop_user', JSON.stringify(userData));
        } else {
          setUser(null);
          localStorage.removeItem('cleardrop_token');
          localStorage.removeItem('cleardrop_user');
        }
      } catch {
        // Fallback to cached user if offline
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    if (data.token) {
      localStorage.setItem('cleardrop_token', data.token);
    }
    const userData = {
      username: data.username,
      displayName: data.displayName || data.username,
      role: data.role,
      roleName: data.roleName,
      email: data.email
    };
    setUser(userData);
    localStorage.setItem('cleardrop_user', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
