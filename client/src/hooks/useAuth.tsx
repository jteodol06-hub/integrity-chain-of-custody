import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage write errors
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage remove errors
    }
  },
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    badgeNumber?: string;
    department?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = safeStorage.getItem('iccf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => safeStorage.getItem('iccf_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = safeStorage.getItem('iccf_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.data.user) {
          setUser(res.data.data.user);
          safeStorage.setItem('iccf_user', JSON.stringify(res.data.data.user));
        }
      } catch {
        safeStorage.removeItem('iccf_token');
        safeStorage.removeItem('iccf_user');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: loggedInUser, token: authToken } = res.data.data;
      setUser(loggedInUser);
      setToken(authToken);
      safeStorage.setItem('iccf_token', authToken);
      safeStorage.setItem('iccf_user', JSON.stringify(loggedInUser));
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    badgeNumber?: string;
    department?: string;
  }) => {
    const res = await api.post('/auth/register', data);
    if (res.data.success) {
      const { user: registeredUser, token: authToken } = res.data.data;
      setUser(registeredUser);
      setToken(authToken);
      safeStorage.setItem('iccf_token', authToken);
      safeStorage.setItem('iccf_user', JSON.stringify(registeredUser));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      safeStorage.removeItem('iccf_token');
      safeStorage.removeItem('iccf_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
