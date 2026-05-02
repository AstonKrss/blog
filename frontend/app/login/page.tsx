"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2, Sparkles, User, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.push("/dashboard");
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-pink-500/5 blur-[120px]" />
          <div className="animate-float-delayed -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/15 via-teal-500/10 to-emerald-500/5 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="rounded-2xl glass-card shadow-2xl overflow-hidden">
            {/* Gradient top bar */}
            <div className="h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />

            <div className="p-8">
              {/* Header */}
              <div className="mb-8 text-center animate-fade-in-up">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-xl shadow-rose-500/30">
                  <LogIn className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-black">欢迎回来</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  还没有账号？{" "}
                  <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">立即注册</Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up delay-100">
                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Username */}
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
                    placeholder="请输入用户名"
                    required
                  />
                </div>

                {/* Password */}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
                    placeholder="请输入密码"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-rose-500/20 transition-all hover:shadow-2xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin relative z-10" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">登录</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}