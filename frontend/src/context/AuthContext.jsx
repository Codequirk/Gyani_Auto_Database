import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount by making a test request
    const verifyToken = async () => {
      if (token) {
        try {
          // Try to fetch admins list to verify token is valid
          await api.get('/admins');
          setLoading(false);
        } catch (error) {
          // Token is invalid, clear it
          console.warn('Token validation failed, clearing auth');
          localStorage.removeItem('auth_token');
          setToken(null);
          setAdmin(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = useCallback((adminData, newToken) => {
    setAdmin(adminData);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
  }, []);

  const logout = useCallback(() => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, []);

  const value = {
    admin,
    token,
    login,
    logout,
    isAuthenticated: !!token,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
