"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
    } catch (err: any) {
      setError(err.message || "注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><p>加载中...</p></main><Footer /></div>;
  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 -right-32 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pink-400/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-scale-in">
          <div className="rounded-2xl border bg-card/80 backdrop-blur-xl p-8 shadow-lg glow-card">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">创建账号</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                已有账号？{" "}
                <Link href="/login" className="text-indigo-500 hover:text-indigo-600 font-medium">立即登录</Link>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium">用户名</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">邮箱</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="请输入邮箱"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">密码</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="至少6个字符"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" />注册</>}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
