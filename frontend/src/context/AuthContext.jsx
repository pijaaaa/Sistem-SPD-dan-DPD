import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await api.get('/api/user');
      setUser(res.data);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (credentials) => {
    await api.get('/sanctum/csrf-cookie');
    const res = await api.post('/api/login', credentials);
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await api.post('/api/logout');
    setUser(null);
  };

  const hasRole = (roleName) => {
    return user?.employee?.role?.name === roleName;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};