import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, getToken, setToken, removeToken, normalizeUser } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  full_name: string;
  role: 'admin' | 'inventory_clerk' | 'accountant';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    auth.me()
      .then(({ user: u }) => setUser(normalizeUser(u) as AuthUser))
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await auth.login(email, password);
    setToken(token);
    setUser(normalizeUser(u) as AuthUser);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const { token, user: u } = await auth.register({ fullName, email, password });
    setToken(token);
    setUser(normalizeUser(u) as AuthUser);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
