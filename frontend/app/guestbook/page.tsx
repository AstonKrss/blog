"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MessageCircle, Loader2, Send, User } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function GuestbookPage() {
  const [guestbooks, setGuestbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/public/guestbook?page=1&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setGuestbooks(data.data?.guestbooks || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) {
      alert("请填写昵称和留言内容");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, content, contact }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert("留言成功！");
        setNickname("");
        setContent("");
        setContact("");
        // 刷新列表
        window.location.reload();
      } else {
        alert(data.message || "留言失败");
      }
    } catch { alert("留言失败"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-teal-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">留言板</h1>
              <p className="text-sm text-muted-foreground">留下你的足迹</p>
            </div>
          </div>

          <div className="mb-10 rounded-2xl border bg-card/80 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">发表留言</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="昵称 *"
                  className="rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="联系方式 (微信/QQ，可选)"
                  className="rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="留言内容 *"
                rows={4}
                className="w-full resize-none rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={submitting || !nickname.trim() || !content.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                提交留言
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">全部留言 ({guestbooks.length})</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : guestbooks.length > 0 ? (
              <div className="space-y-4">
                {guestbooks.map((gb) => (
                  <div key={gb.id} className="rounded-xl border bg-card/80 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold">
                        {gb.nickname?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium">{gb.nickname}</div>
                        <div className="text-xs text-muted-foreground">
                          {gb.createdAt ? new Date(gb.createdAt).toLocaleDateString("zh-CN") : ""}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{gb.content}</p>
                    {gb.contact && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        联系: {gb.contact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-card py-12 text-center">
                <p className="text-muted-foreground">还没有留言，快来抢沙发</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}