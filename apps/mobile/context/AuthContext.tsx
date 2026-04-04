import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { authApi, setOnUnauthorized } from '@/lib/api';

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem('agrotech_token');
      const storedUser = await AsyncStorage.getItem('agrotech_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setOnUnauthorized(async () => {
      setToken(null);
      setUser(null);
      router.replace('/(auth)/login');
    });
  }, []);

  const saveSession = async (u: User, t: string) => {
    await AsyncStorage.setItem('agrotech_token', t);
    await AsyncStorage.setItem('agrotech_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    const { user: u, token: t } = res.data;
    await saveSession(u, t);
  };

  const register = async (data: any) => {
    const res = await authApi.register(data);
    const { user: u, token: t } = res.data;
    await saveSession(u, t);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('agrotech_token');
    await AsyncStorage.removeItem('agrotech_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      const updatedUser = res.data;
      await AsyncStorage.setItem('agrotech_user', JSON.stringify(updatedUser));
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
