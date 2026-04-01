'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenant: { id: string; name: string; slug: string; plan: string };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('agrotech_token');
    const storedUser = localStorage.getItem('agrotech_user');
    if (storedToken && storedUser) {
      // Resynchronise le cookie si absent (ex: effacé manuellement)
      document.cookie = `agrotech_token=${storedToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const saveSession = (u: User, t: string) => {
    localStorage.setItem('agrotech_token', t);
    localStorage.setItem('agrotech_user', JSON.stringify(u));
    // Cookie lisible par le middleware (Edge Runtime ne peut pas lire localStorage)
    document.cookie = `agrotech_token=${t}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const { user: u, token: t } = res.data;
    saveSession(u, t);
  };

  const register = async (data: any) => {
    const res = await authApi.register(data);
    const { user: u, token: t } = res.data;
    saveSession(u, t);
  };

  const logout = () => {
    localStorage.removeItem('agrotech_token');
    localStorage.removeItem('agrotech_user');
    document.cookie = 'agrotech_token=; path=/; max-age=0';
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      const updatedUser = res.data;
      localStorage.setItem('agrotech_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch {
      // silencieux
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
