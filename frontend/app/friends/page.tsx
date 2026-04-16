"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Link2, Loader2, Send, ExternalLink, Check, X, Clock } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", description: "", email: "" });

  useEffect(() => {
    fetch(`${API_BASE}/api/public/friends`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setFriends(data.data?.friends || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      alert("请填写网站名称和链接");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert("申请成功！审核通过后会显示在这里");
        setShowApply(false);
        setForm({ name: "", url: "", description: "", email: "" });
      } else {
        alert(data.message || "申请失败");
      }
    } catch { alert("申请失败"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-blue-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">友链</h1>
                <p className="text-sm text-muted-foreground">交换链接，共同成长</p>
              </div>
            </div>
            <button
              onClick={() => setShowApply(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
            >
              <Send className="h-4 w-4" />
              申请友链
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : friends.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {friends.map((friend) => (
                <a
                  key={friend.id}
                  href={friend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-xl border bg-card/80 p-5 shadow-sm hover:border-blue-500/50 hover:bg-blue-500/5"
                >
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                      {friend.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-blue-500 truncate">{friend.name}</h3>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </div>
                    {friend.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{friend.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card py-12 text-center">
              <p className="text-muted-foreground">暂无友链，快来申请吧</p>
            </div>
          )}

          <div className="mt-12 rounded-xl border bg-card/50 p-6">
            <h3 className="mb-4 font-semibold">申请友链</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                网站正常运行，内容健康
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                至少有一个可访问的链接指向本站
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                无违规违法内容
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />

      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowApply(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">申请友链</h3>
              <button onClick={() => setShowApply(false)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleApply} className="space-y-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="网站名称 *"
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="网站链接 *"
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="网站描述"
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="邮箱 (用于通知审核结果)"
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={submitting || !form.name.trim() || !form.url.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "提交申请"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}