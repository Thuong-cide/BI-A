import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetMe, User } from '@workspace/api-client-react';

interface AuthContextType {
  token: string | null;
  currentUser: User | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [location, setLocation] = useLocation();

  const { data: currentUser, isLoading } = useGetMe({
    query: {
      queryKey: ["me", token],
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (!token && location !== '/login') {
      setLocation('/login');
    }
  }, [token, location, setLocation]);

  useEffect(() => {
    // Handle unauthorized or invalid token
    if (token && !isLoading && !currentUser && location !== '/login') {
      localStorage.removeItem('token');
      setToken(null);
      setLocation('/login');
    }
  }, [token, isLoading, currentUser, location, setLocation]);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ token, currentUser: currentUser || null, login, logout, isLoading }}>
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
