"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, code: string) => Promise<void>;
  sendRegisterCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    try {
      // 从 cookie 获取 token（httpOnly cookie 由后端设置）
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 0 && data.data?.user) {
        setUser(data.data.user);
      } else {
        // 清除失效的 cookie
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || data.code !== 0) throw new Error(data.message || "登录失败");
    // token 已通过 httpOnly cookie 由后端设置，前端无需存储
    setUser(data.data.user);
    router.push("/dashboard");
    router.refresh();
  };

  const sendRegisterCode = async (email: string) => {
    const res = await fetch(`${API_BASE}/api/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || data.code !== 0) throw new Error(data.message || "发送验证码失败");
  };

  const register = async (username: string, email: string, password: string, code: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, code }),
    });
    const data = await res.json();
    if (!res.ok || data.code !== 0) throw new Error(data.message || "注册失败");
    // token 已通过 httpOnly cookie 由后端设置，前端无需存储
    setUser(data.data.user);
    router.push("/dashboard");
    router.refresh();
  };

  const logout = async () => {
    // 调用后端登出接口清除 httpOnly cookie
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    } catch {
      // 忽略错误，继续清除本地状态
    }
    // 清除本地 cookie 副本（虽然后端已清除，这里做双重保险）
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, sendRegisterCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
