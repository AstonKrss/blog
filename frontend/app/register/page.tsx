"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, Sparkles, Send, CheckCircle, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const { register, sendRegisterCode, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendCode = async () => {
    if (!email) { setError("请先输入邮箱"); return; }
    setSendingCode(true); setError("");
    try {
      await sendRegisterCode(email);
      setCodeSent(true); setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) { setError(err.message || "发送验证码失败"); setCodeSent(false); }
    finally { setSendingCode(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(username, email, password, code); }
    catch (err: any) { setError(err.message || "注册失败，请稍后重试"); }
    finally { setLoading(false); }
  };

  if (authLoading) return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><div className="flex flex-col items-center gap-4 animate-fade-in"><Loader2 className="h-10 w-10 animate-spin text-rose-500" /><p className="text-muted-foreground">加载中...</p></div></main><Footer /></div>;
  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-pink-500/15 via-pink-500/10 to-rose-500/5 blur-[120px]" />
          <div className="animate-float-delayed -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-pink-500/5 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="rounded-2xl glass-card shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-pink-500 via-pink-500 to-rose-500" />
            <div className="p-8">
              <div className="mb-8 text-center animate-fade-in-up">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-pink-500 shadow-xl shadow-pink-500/30">
                  <UserPlus className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-black">创建账号</h1>
                <p className="mt-2 text-sm text-muted-foreground">已有账号？<Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">立即登录</Link></p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up delay-100">
                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-pink-500 transition-colors" />
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm" placeholder="请输入用户名" required />
                </div>

                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-pink-500 transition-colors" />
                  <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setCodeSent(false); }} className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm" placeholder="请输入邮箱" required />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-pink-500 transition-colors" />
                  <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm" placeholder="验证码" maxLength={6} required />
                  <button type="button" onClick={handleSendCode} disabled={sendingCode || countdown > 0}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 bg-gradient-to-r from-pink-500 to-pink-500 text-white shadow-md hover:shadow-lg">
                    {sendingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : countdown > 0 ? `${countdown}s` : codeSent ? <CheckCircle className="h-3.5 w-3.5" /> : "获取验证码"}
                  </button>
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-pink-500 transition-colors" />
                  <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm" placeholder="密码 (至少6个字符)" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button type="submit" disabled={loading || !codeSent} className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-pink-500 to-rose-500 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-pink-500/20 transition-all hover:shadow-2xl hover:shadow-pink-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {loading ? <Loader2 className="h-4 w-4 animate-spin relative z-10" /> : <><Sparkles className="h-4 w-4 relative z-10" /><span className="relative z-10">注册</span></>}
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