"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Link2, Loader2, Send, ExternalLink, Check, X, Plus, Globe,
  User, FileText, Sparkles, Eye, ChevronRight, PlusCircle,
  Monitor, Lock, ShieldCheck
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const gradients = [
  "from-rose-500 to-pink-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-purple-500",
];

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", description: "", email: "" });
  const [activeTab, setActiveTab] = useState<"preview" | "rules" | "apply">("rules");
  const [activeFriend, setActiveFriend] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/public/friends`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          const list = data.data?.friends || [];
          setFriends(list);
          // Default select first friend
          if (list.length > 0) setActiveFriend(list[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
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

  const active = activeFriend !== null ? friends.find(f => f.id === activeFriend) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-orange-400/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-pink-500/8 to-rose-500/5 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-14">
          {/* Page Header */}
          <div className="mb-10 text-center animate-fade-in-up">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-rose-500/30">
              <Link2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-black">友链</h1>
            <p className="text-muted-foreground">
              与志同道合的朋友交换链接，共同成长
            </p>
          </div>

          {/* 40/60 Split Layout */}
          <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
            {/* ── Left 40%: Rules + Actions ── */}
            <aside className="w-full lg:w-[40%] shrink-0 animate-fade-in-left">
              <div className="rounded-2xl glass-card overflow-hidden sticky top-24 space-y-0">
                {/* Tabs */}
                <div className="flex border-b border-border/30">
                  {[
                    { key: "rules", label: "申请规则", icon: ShieldCheck },
                    { key: "apply", label: "申请友链", icon: PlusCircle },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-2 ${
                        activeTab === key
                          ? "border-rose-500 text-rose-500 bg-rose-500/5"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Rules content */}
                {activeTab === "rules" && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-5">
                      <FileText className="h-4 w-4 text-rose-500" />
                      <span className="font-semibold text-sm">交换要求</span>
                    </div>
                    {[
                      { text: "网站正常运行，内容健康积极", type: "check" },
                      { text: "至少有一个可访问的链接指向本站", type: "check" },
                      { text: "无违规违法内容，遵守法律法规", type: "check" },
                      { text: "建议网站内容与技术或博客相关", type: "star" },
                      { text: "申请后会在 24 小时内审核", type: "star" },
                    ].map((rule, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm animate-fade-in-up" style={{ animationDelay: `${0.1 * i}s` }}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${rule.type === "check" ? "bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-500" : "bg-gradient-to-br from-rose-500/15 to-pink-500/15 text-rose-500"}`}>
                          {rule.type === "check" ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        </div>
                        <span className="text-muted-foreground">{rule.text}</span>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-border/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Monitor className="h-4 w-4 text-rose-500" />
                        <span className="font-semibold text-sm">关于预览功能</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        右侧预览区域会尝试嵌入友链网站。部分站点因安全策略限制无法嵌入，
                        这不影响友链的正常访问。点击友链卡片右上角的
                        <ExternalLink className="inline h-3 w-3 mx-0.5" />
                        按钮可单独查看。
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab("apply")}
                      className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5"
                    >
                      <PlusCircle className="h-4 w-4" />
                      我要申请
                    </button>
                  </div>
                )}

                {/* Apply form */}
                {activeTab === "apply" && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <PlusCircle className="h-4 w-4 text-rose-500" />
                      <span className="font-semibold text-sm">填写信息</span>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-1 mb-3">
                      审核通过后会在 24 小时内展示
                    </p>
                    {[
                      { key: "name", label: "网站名称", placeholder: "网站名称 *", icon: Globe },
                      { key: "url", label: "网站链接", placeholder: "https://example.com *", icon: ExternalLink },
                      { key: "description", label: "网站描述", placeholder: "网站描述", icon: FileText },
                      { key: "email", label: "邮箱", placeholder: "邮箱 (用于通知审核结果)", icon: User },
                    ].map(({ key, placeholder, icon: Icon }) => (
                      <div key={key} className="relative group">
                        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-rose-500 transition-colors" />
                        <input
                          type={key === "url" ? "url" : key === "email" ? "email" : "text"}
                          value={form[key as keyof typeof form]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full rounded-xl border border-border/50 bg-card pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={submitting || !form.name.trim() || !form.url.trim()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {submitting ? "提交中..." : "提交申请"}
                    </button>
                    <button
                      onClick={() => setActiveTab("rules")}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      返回规则说明
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* ── Right 60%: Site Preview ── */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl glass-card py-24 animate-fade-in">
                  <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : friends.length > 0 ? (
                <div className="h-full flex flex-col lg:flex-row gap-4">
                  {/* Friend cards — left column */}
                  <div className="w-full lg:w-56 shrink-0 space-y-2 overflow-y-auto max-h-[580px] pr-1">
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <Eye className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-xs font-semibold text-muted-foreground">友链列表 · {friends.length}</span>
                    </div>
                    {friends.map((friend, i) => {
                      const gradient = gradients[i % gradients.length];
                      const isActive = activeFriend === friend.id;
                      return (
                        <button
                          key={friend.id}
                          onClick={() => setActiveFriend(friend.id)}
                          className={`w-full text-left group relative flex items-center gap-3 rounded-xl p-3 transition-all duration-300 overflow-hidden ${
                            isActive
                              ? "glass-card ring-2 ring-rose-500/30"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          {isActive && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.06]`} />
                          )}
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt="" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
                            ) : (
                              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white text-xs font-bold shadow-sm`}>
                                {friend.name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="relative flex-1 min-w-0">
                            <div className="text-xs font-medium truncate group-hover:text-rose-500 transition-colors leading-tight">
                              {friend.name}
                            </div>
                            {friend.description && (
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5 leading-snug">
                                {friend.description}
                              </div>
                            )}
                          </div>
                          {/* Active indicator */}
                          {isActive && (
                            <div className={`absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b ${gradient} rounded-l`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* iframe preview — right area */}
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl glass-card overflow-hidden h-full min-h-[580px] flex flex-col">
                      {active ? (
                        <>
                          {/* iframe header */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-gradient-to-r from-rose-500/8 to-pink-500/8 shrink-0">
                            {active.avatar ? (
                              <img src={active.avatar} alt="" className="h-7 w-7 rounded-lg object-cover" />
                            ) : (
                              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${gradients[friends.indexOf(active) % gradients.length]} text-white text-xs font-bold`}>
                                {active.name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{active.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{active.url}</div>
                            </div>
                            <a
                              href={active.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              title="在新窗口打开"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>

                          {/* iframe content */}
                          <div className="flex-1 relative bg-white dark:bg-[#1a1a2e]">
                            {iframeError[active.id] ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                <Globe className="h-10 w-10 text-muted-foreground/20 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground mb-1">无法嵌入此网站</p>
                                <p className="text-xs text-muted-foreground/50 mb-4 leading-relaxed">
                                  该站点不允许被嵌入（X-Frame-Options 限制）<br />
                                  点击上方按钮在新窗口查看
                                </p>
                                <a
                                  href={active.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  在新窗口打开
                                </a>
                              </div>
                            ) : (
                              <iframe
                                key={active.id}
                                src={active.url}
                                className="w-full h-full border-0"
                                title={active.name}
                                tabIndex={0}
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                onLoad={() => setIframeError(prev => ({ ...prev, [active.id]: false }))}
                                onError={() => setIframeError(prev => ({ ...prev, [active.id]: true }))}
                                loading="lazy"
                              />
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                          <Monitor className="h-12 w-12 text-muted-foreground/10 mb-4" />
                          <p className="text-base font-bold mb-1">选择一个友链预览</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            点击左侧友链卡片<br />这里会实时预览网站
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl glass-card py-24 text-center shadow-lg animate-fade-in">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-rose-500/10 blur-2xl" />
                  </div>
                  <div className="relative">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
                      <Link2 className="h-8 w-8 text-rose-500" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold">暂无友链</h3>
                    <p className="text-muted-foreground mb-6">快来成为第一个友链吧</p>
                    <button
                      onClick={() => { setShowApply(true); setActiveTab("apply"); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-1"
                    >
                      <Plus className="h-4 w-4" />
                      申请友链
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
