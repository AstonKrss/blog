"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MessageCircle, Loader2, Send, User, Sparkles, ChevronDown, MessageSquare, AtSign } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function GuestbookPage() {
  const [guestbooks, setGuestbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/public/guestbook?page=1&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setGuestbooks(Array.isArray(data.data) ? data.data : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) {
      setErrorMsg("请填写昵称和留言内容");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, content, contact }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSuccessMsg("留言成功，感谢您的反馈！");
        setNickname("");
        setContent("");
        setContact("");
        // Refresh list
        fetch(`${API_BASE}/api/public/guestbook?page=1&limit=50`)
          .then(r => r.json())
          .then(d => {
            if (d.code === 0) setGuestbooks(Array.isArray(d.data) ? d.data : []);
          });
      } else {
        setErrorMsg(data.message || "留言失败");
      }
    } catch {
      setErrorMsg("网络错误，请稍后重试");
    }
    finally { setSubmitting(false); }
  };

  const gradients = [
    "from-rose-500 to-orange-400",
    "from-cyan-500 to-teal-500",
    "from-pink-500 to-pink-500",
    "from-emerald-500 to-green-500",
    "from-orange-500 to-amber-500",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-pink-500/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-pink-500/8 to-rose-500/5 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-14">
          {/* Page Header */}
          <div className="mb-12 flex items-center gap-4 animate-fade-in-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-pink-500/20">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">留言板</h1>
              <p className="text-sm text-muted-foreground mt-0.5">留下你的足迹，我会认真回复每一句话</p>
            </div>
          </div>

          {/* Message form */}
          <div className="mb-10 rounded-2xl glass-card overflow-hidden shadow-lg animate-fade-in-up delay-100">
            {/* Form header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30 bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-pink-500/5">
              <MessageSquare className="h-4 w-4 text-rose-500" />
              <h2 className="text-base font-semibold">发表留言</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Nickname + Contact row */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="昵称 *"
                    className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
                  />
                </div>
                <div className="relative group">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="联系方式 (微信/QQ，可选)"
                    className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="relative group">
                <MessageCircle className="absolute left-4 top-4 h-4 w-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="想说的话 * ... "
                  rows={5}
                  className="w-full resize-none rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
                />
              </div>

              {/* Feedback messages */}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-600 px-4 py-3 text-sm animate-fade-in">
                  <Sparkles className="h-4 w-4" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 text-red-600 px-4 py-3 text-sm animate-fade-in">
                  <MessageCircle className="h-4 w-4" />
                  {errorMsg}
                </div>
              )}

              {/* Submit button */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">* 为必填项，留言内容会公开显示</p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin relative z-10" />
                  ) : (
                    <Send className="h-4 w-4 relative z-10 transition-transform group-hover:-translate-y-1 group-hover:translate-x-0.5" />
                  )}
                  <span className="relative z-10">{submitting ? "提交中..." : "提交留言"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Messages list */}
          <div className="space-y-5 animate-fade-in-up delay-200">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-pink-500" />
              <h2 className="text-xl font-bold">
                全部留言
                <span className="ml-2 text-sm font-normal text-muted-foreground">({guestbooks.length})</span>
              </h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl glass-card">
                <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
                <p className="text-muted-foreground">加载留言中...</p>
              </div>
            ) : guestbooks.length > 0 ? (
              <div className="space-y-4">
                {guestbooks.map((gb, i) => {
                  const gradient = gradients[i % gradients.length];
                  return (
                    <div
                      key={gb.id}
                      className="group rounded-2xl glass-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-400 hover:-translate-y-1 border border-transparent hover:border-rose-500/20 animate-fade-in-up"
                      style={{ animationDelay: `${0.05 * i}s` }}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-3.5 px-6 py-4 border-b border-border/20 bg-gradient-to-r from-rose-500/[0.03] to-transparent">
                        {/* Avatar */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-bold text-base shadow-md transition-transform duration-300 group-hover:scale-110`}>
                          {gb.nickname?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{gb.nickname}</div>
                          <div className="text-xs text-muted-foreground">
                            {gb.createdAt ? new Date(gb.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                        </div>
                        {/* Gradient accent */}
                        <div className={`h-6 w-1 rounded-full bg-gradient-to-b ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      </div>

                      {/* Content */}
                      <div className="px-6 py-5">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {gb.content}
                        </p>
                        {gb.contact && (
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <AtSign className="h-3 w-3" />
                            <span className="rounded-full bg-muted px-2.5 py-0.5">{gb.contact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl glass-card py-20 text-center shadow-sm animate-fade-in">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-rose-400/10 blur-2xl" />
                </div>
                <div className="relative">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-400/20">
                    <MessageCircle className="h-8 w-8 text-rose-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">还没有留言</h3>
                  <p className="text-muted-foreground">快来抢沙发，留下你的足迹吧</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}