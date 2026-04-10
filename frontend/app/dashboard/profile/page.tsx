"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { User, Save, Loader2, Sparkles } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = document.cookie.split("; ").find((row) => row.startsWith("auth_token="))?.split("=")[1];
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 0 && data.data?.user) {
          const u = data.data.user;
          setUser(u);
          setDisplayName(u.displayName || "");
          setBio(u.bio || "");
          setAvatarUrl(u.avatarUrl || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = document.cookie.split("; ").find((row) => row.startsWith("auth_token="))?.split("=")[1];
      await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><p>加载中...</p></main><Footer /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-orange-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">个人资料</h1>
              <p className="text-sm text-muted-foreground">管理你的个人信息</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                  {displayName ? displayName[0].toUpperCase() : user.username[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-card flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.username}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <span className="inline-block mt-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-500">
                  {user.role === "ADMIN" ? "管理员" : user.role === "AUTHOR" ? "作者" : "读者"}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">显示名称</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="你的显示名称" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">头像 URL</label>
                <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="https://example.com/avatar.jpg" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">个人简介</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                  className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="介绍一下自己..." />
              </div>
              <div className="pt-4">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />保存修改</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
