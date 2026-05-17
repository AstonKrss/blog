"use client"
import { getToken } from "@/lib/token"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/components/auth-context"
import { Users, FileText, MessageCircle, Eye, Globe, MapPin, Cpu, Terminal, Activity, Server, Shield, AlertTriangle, Bug, Skull, Key, X, ChevronDown, ArrowLeft, Monitor } from "lucide-react"
import { useRouter } from "next/navigation"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

interface Stats {
  totalPosts: number;
  totalTags: number;
  totalComments: number;
  totalViews: number;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

interface Analytics {
  totalVisits: number;
  uniqueIps: number;
  topCountries: { country: string; count: number }[];
  topIsps: { isp: string; count: number }[];
  topPages: { path: string; count: number }[];
  topIps: { ip: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
}

interface SecurityLog {
  id: string;
  ip: string;
  path: string;
  method: string;
  payload: string;
  attackType: string;
  userAgent: string;
  queryParams: string;
  riskLevel: number;
  createdAt: string;
}

interface SecurityStats {
  totalAttacks: number;
  todayCount: number;
  xssCount: number;
  sqlInjectionCount: number;
  bruteForceCount: number;
  weakPasswordCount: number;
  pathTraversalCount: number;
  commandInjectionCount: number;
  scannerCount: number;
  sensitiveAccessCount: number;
  otherCount: number;
  topAttackers: { ip: string; count: number; lastAttack: string }[];
  topAttackPaths: { path: string; count: number }[];
  attackTrend: { date: string; count: number }[];
  recentLogs: SecurityLog[];
}

interface ThreatSignature {
  id: string;
  ip: string;
  payloads: string;
  userAgent: string;
  attackCount: number;
  attackTypes: string;
  reviewed: boolean;
  riskLevel: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "traffic" | "users" | "security">("overview");

  // Detail panel states
  const [activeDetail, setActiveDetail] = useState<"users" | "posts" | "comments" | "views" | null>(null);
  const [securityFilter, setSecurityFilter] = useState<string | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showTrendDetail, setShowTrendDetail] = useState(false);
  const [threats, setThreats] = useState<ThreatSignature[]>([]);
  const [threatsLoading, setThreatsLoading] = useState(false);
  const [threatReviewNote, setThreatReviewNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
      return;
    }

    if (user && user.role === "ADMIN") {
      const token = getToken();
      Promise.all([
        fetch(`${API_BASE}/api/public/stats`).then(r => r.json()),
        fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE}/api/analytics/visits`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE}/api/admin/security/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      ]).then(([statsRes, usersRes, analyticsRes, securityRes]) => {
        if (statsRes.code === 0) setStats(statsRes.data);
        if (usersRes.code === 0) setUsers(usersRes.data);
        if (analyticsRes.code === 0) setAnalytics(analyticsRes.data);
        if (securityRes.code === 0) {
          setSecurityStats(securityRes.data);
          setFilteredLogs(securityRes.data.recentLogs || []);
        }
        loadThreats();
      }).catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const loadFilteredLogs = (attackType: string | null) => {
    setSecurityFilter(attackType);
    setLogsLoading(true);
    const token = getToken();
    const params = new URLSearchParams();
    if (attackType) params.set("attackType", attackType);
    params.set("limit", "100");
    fetch(`${API_BASE}/api/admin/security/logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json())
      .then(data => {
        if (data.code === 0) setFilteredLogs(data.data || []);
      })
      .catch(console.error)
      .finally(() => setLogsLoading(false));
  };

  const loadThreats = () => {
    setThreatsLoading(true);
    const token = getToken();
    fetch(`${API_BASE}/api/admin/security/threats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json())
      .then(data => {
        if (data.code === 0) setThreats(data.data || []);
      })
      .catch(console.error)
      .finally(() => setThreatsLoading(false));
  };

  const markThreatReviewed = (id: string) => {
    const token = getToken();
    const note = threatReviewNote[id] || "";
    fetch(`${API_BASE}/api/admin/security/threats/${id}/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ note })
    }).then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setThreats(prev => prev.filter(t => t.id !== id));
        }
      })
      .catch(console.error);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground flex items-center gap-2">
            <Terminal className="h-4 w-4" /> 初始化系统监控...
          </div>
        </main>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  const tabs = [
    { id: "overview", label: "系统概览", icon: Cpu },
    { id: "traffic", label: "流量分析", icon: Activity },
    { id: "users", label: "用户管理", icon: Users },
    { id: "security", label: "安全监控", icon: Shield },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-rose-500/5 dark:bg-rose-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-pink-500/5 dark:bg-pink-500/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-lg shadow-rose-500/25">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">管理后台</h1>
                <p className="text-xs text-muted-foreground">站点运维监控面板</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              系统正常
            </div>
          </div>

          <div className="flex gap-1 mb-6 p-1 bg-muted/30 rounded-2xl inline-flex border border-border/50 glass-card">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setActiveDetail(null); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Clickable stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <button onClick={() => { setActiveDetail("users"); setActiveTab("users"); }}
                  className="group relative overflow-hidden rounded-2xl glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-400 cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-400" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">用户总数</p>
                      <p className="text-2xl font-black text-foreground">{users.length}</p>
                      <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">点击查看详情 →</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => setActiveDetail("posts")}
                  className="group relative overflow-hidden rounded-2xl glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-400 cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500 opacity-0 group-hover:opacity-10 transition-opacity duration-400" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">文章总数</p>
                      <p className="text-2xl font-black text-foreground">{stats?.totalPosts || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">点击查看详情 →</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => setActiveDetail("comments")}
                  className="group relative overflow-hidden rounded-2xl glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-400 cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-400 opacity-0 group-hover:opacity-10 transition-opacity duration-400" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">评论总数</p>
                      <p className="text-2xl font-black text-foreground">{stats?.totalComments || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">点击查看详情 →</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => setActiveDetail("views")}
                  className="group relative overflow-hidden rounded-2xl glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-400 cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-yellow-400 opacity-0 group-hover:opacity-10 transition-opacity duration-400" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">总阅读量</p>
                      <p className="text-2xl font-black text-foreground">{(stats?.totalViews || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">点击查看详情 →</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Inline detail panels */}
              {activeDetail === "users" && (
                <div className="rounded-2xl glass-card overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-border/30 flex items-center gap-2 bg-gradient-to-r from-rose-500/5 to-pink-500/5">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setActiveDetail(null)} />
                    <Users className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium text-foreground">用户详情</span>
                    <span className="ml-auto text-xs text-muted-foreground">{users.length} 位用户</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/30 text-muted-foreground text-xs">
                          <th className="px-4 py-3 text-left font-medium">用户</th>
                          <th className="px-4 py-3 text-left font-medium">邮箱</th>
                          <th className="px-4 py-3 text-left font-medium">角色</th>
                          <th className="px-4 py-3 text-left font-medium">注册时间</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {users.map(u => (
                          <tr key={u.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-foreground font-medium">{u.displayName || u.username}</td>
                            <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                u.role === "ADMIN" ? "bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-600 dark:text-rose-400" :
                                u.role === "AUTHOR" ? "bg-gradient-to-r from-pink-500/15 to-rose-500/15 text-pink-600 dark:text-pink-400" :
                                "bg-muted/50 text-muted-foreground"
                              }`}>{u.role === "ADMIN" ? "管理员" : u.role === "AUTHOR" ? "作者" : "读者"}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString("zh-CN") : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDetail === "posts" && (
                <div className="rounded-2xl glass-card p-5 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setActiveDetail(null)} />
                    <FileText className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium text-foreground">文章统计</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{stats?.totalPosts || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">文章总数</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{stats?.totalViews || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">总阅读量</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-400/10 border border-orange-500/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{stats?.totalTags || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">标签数量</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-amber-400/10 to-yellow-400/10 border border-amber-400/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{stats?.totalComments || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">评论总数</p>
                    </div>
                  </div>
                </div>
              )}

              {activeDetail === "comments" && (
                <div className="rounded-2xl glass-card p-5 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setActiveDetail(null)} />
                    <MessageCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-foreground">评论统计</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-400/10 border border-orange-500/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{stats?.totalComments || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">评论总数</p>
                    </div>
                  </div>
                </div>
              )}

              {activeDetail === "views" && (
                <div className="rounded-2xl glass-card p-5 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setActiveDetail(null)} />
                    <Eye className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-medium text-foreground">阅读量详情</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-orange-400/10 to-yellow-400/10 border border-orange-400/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{(stats?.totalViews || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">总阅读量</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/10 p-4 text-center">
                      <p className="text-3xl font-black gradient-text">{stats?.totalPosts || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">文章数量</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 24h visit trend */}
              <div className="rounded-2xl glass-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-orange-400" />
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium text-foreground">24小时访问趋势</span>
                  <span className="ml-2 text-xs text-muted-foreground">点击查看时段详情</span>
                </div>
                <div className="h-32 flex items-end gap-1">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hourData = analytics?.hourlyDistribution?.find((h: any) => h.hour === i);
                    const count = hourData?.count || 0;
                    const maxCount = Math.max(...(analytics?.hourlyDistribution || [{count: 1}]).map((h: any) => h.count), 1);
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-rose-500/30 to-pink-500/60 rounded-t hover:from-rose-500/50 hover:to-pink-500/80 transition-all cursor-pointer"
                          style={{ height: `${Math.max(height, 5)}%`, minHeight: '20px' }}
                          title={`${i}:00 - ${count}次`} />
                        <span className="text-[10px] text-muted-foreground">{i % 6 === 0 ? `${i}` : ""}</span>
                      </div>
                    );
                  })}
                  {(!analytics?.hourlyDistribution || analytics.hourlyDistribution.length === 0) && (
                    <div className="flex-1 h-full flex items-center justify-center text-muted-foreground text-sm">
                      暂无数据，请先访问网站以收集数据
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:59</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "traffic" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl glass-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium text-foreground">访问地区</span>
                </div>
                <div className="space-y-3">
                  {analytics?.topCountries?.slice(0, 8).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">{item.city || item.country || '未知'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" style={{ width: `${(item.count / (analytics?.totalVisits || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                  {(!analytics?.topCountries || analytics.topCountries.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl glass-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <div className="flex items-center gap-2 mb-4">
                  <Server className="h-4 w-4 text-pink-500" />
                  <span className="text-sm font-medium text-foreground">运营商</span>
                </div>
                <div className="space-y-3">
                  {analytics?.topIsps?.slice(0, 8).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">{item.isp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" style={{ width: `${(item.count / (analytics?.totalVisits || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                  {(!analytics?.topIsps || analytics.topIsps.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl glass-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">热门页面</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topPages?.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate flex-1 font-mono">{item.path}</span>
                      <span className="text-xs text-muted-foreground ml-2">{item.count}</span>
                    </div>
                  ))}
                  {(!analytics?.topPages || analytics.topPages.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl glass-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-foreground">访问IP排行</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topIps?.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-mono">{item.ip}</span>
                      <span className="text-xs text-muted-foreground">{item.count}</span>
                    </div>
                  ))}
                  {(!analytics?.topIps || analytics.topIps.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="rounded-2xl glass-card overflow-hidden">
              <div className="p-4 border-b border-border/30 flex items-center gap-2 bg-gradient-to-r from-rose-500/5 to-pink-500/5">
                <Users className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium text-foreground">用户列表</span>
                <span className="ml-auto text-xs text-muted-foreground">{users.length} 位用户</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground text-xs">
                      <th className="px-4 py-3 text-left font-medium">用户</th>
                      <th className="px-4 py-3 text-left font-medium">邮箱</th>
                      <th className="px-4 py-3 text-left font-medium">角色</th>
                      <th className="px-4 py-3 text-left font-medium">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{u.displayName || u.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.role === "ADMIN" ? "bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-600 dark:text-rose-400" :
                            u.role === "AUTHOR" ? "bg-gradient-to-r from-pink-500/15 to-rose-500/15 text-pink-600 dark:text-pink-400" :
                            "bg-muted/50 text-muted-foreground"
                          }`}>{u.role === "ADMIN" ? "管理员" : u.role === "AUTHOR" ? "作者" : "读者"}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("zh-CN") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              {/* 安全统计卡片 - 可点击 */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <button onClick={() => { loadFilteredLogs(null); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === null ? 'ring-2 ring-red-500/50' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">全部攻击</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.totalAttacks || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg opacity-80">
                      <Skull className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => { loadFilteredLogs("XSS"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "XSS" ? 'ring-2 ring-yellow-500/50' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-amber-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">XSS</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.xssCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg opacity-80">
                      <Bug className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => { loadFilteredLogs("SQL_INJECTION"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "SQL_INJECTION" ? 'ring-2 ring-pink-500/50' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SQL注入</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.sqlInjectionCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-pink-500 shadow-lg opacity-80">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => { loadFilteredLogs("BRUTE_FORCE"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "BRUTE_FORCE" ? 'ring-2 ring-cyan-500/50' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">暴力破解</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.bruteForceCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg opacity-80">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </button>

                <button onClick={() => { loadFilteredLogs("WEAK_PASSWORD_ATTACK"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "WEAK_PASSWORD_ATTACK" ? 'ring-2 ring-orange-500/50' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">弱密码攻击</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.weakPasswordCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg opacity-80">
                      <Key className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </button>
              </div>

              {/* 第二行 */}
              <div className="grid gap-4 md:grid-cols-4">
                <button onClick={() => { loadFilteredLogs("PATH_TRAVERSAL"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "PATH_TRAVERSAL" ? 'ring-2 ring-red-500/50' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-red-500/10">
                      <FileText className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">路径穿越</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.pathTraversalCount || 0}</p>
                </button>

                <button onClick={() => { loadFilteredLogs("COMMAND_INJECTION"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "COMMAND_INJECTION" ? 'ring-2 ring-orange-500/50' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-orange-500/10">
                      <Terminal className="h-3 w-3 text-orange-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">命令注入</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.commandInjectionCount || 0}</p>
                </button>

                <button onClick={() => { loadFilteredLogs("SCANNER"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "SCANNER" ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-blue-500/10">
                      <Activity className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">扫描探测</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.scannerCount || 0}</p>
                </button>

                <button onClick={() => { loadFilteredLogs("SENSITIVE_ACCESS"); setShowTrendDetail(false); }}
                  className={`group relative overflow-hidden rounded-2xl border bg-card p-4 text-left hover:shadow-lg transition-all cursor-pointer ${securityFilter === "SENSITIVE_ACCESS" ? 'ring-2 ring-gray-500/50' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-gray-500/10">
                      <Monitor className="h-3 w-3 text-gray-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">敏感访问</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.sensitiveAccessCount || 0}</p>
                </button>
              </div>

              {/* 7天攻击趋势 — 可点击查看过滤后的攻击记录 */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium text-foreground">7天攻击趋势</span>
                  <button onClick={() => { setShowTrendDetail(!showTrendDetail); setSecurityFilter(null); setFilteredLogs(securityStats?.recentLogs || []); }}
                    className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {showTrendDetail ? <ArrowLeft className="h-3 w-3" /> : null}
                    {showTrendDetail ? "返回概览" : "点击查看详情"}
                    <ChevronDown className={`h-3 w-3 transition-transform ${showTrendDetail ? "rotate-180" : ""}`} />
                  </button>
                </div>
                <div className="h-40 flex items-end gap-2">
                  {securityStats?.attackTrend && securityStats.attackTrend.length > 0 ? (
                    securityStats.attackTrend.map((item: any, i: number) => {
                      const maxCount = Math.max(...securityStats.attackTrend.map((h: any) => h.count), 1);
                      const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-gradient-to-t from-red-500/30 to-red-500 rounded-t hover:from-red-500/50 hover:to-red-500 transition-all cursor-pointer"
                            style={{ height: `${Math.max(height, 5)}%`, minHeight: '20px' }}
                            title={`${item.date}: ${item.count}次`}
                          />
                          <span className="text-xs text-muted-foreground">{item.date}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                      <Bug className="h-4 w-4" />
                      暂无趋势数据（可能在数据库中找不到创建时间，或需要触发安全攻击才能产生数据）
                    </div>
                  )}
                </div>
              </div>

              {/* 攻击排行 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Skull className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-foreground">攻击者排行</span>
                  </div>
                  <div className="space-y-3">
                    {securityStats?.topAttackers && securityStats.topAttackers.length > 0 ? (
                      securityStats.topAttackers.slice(0, 8).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Terminal className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-foreground font-mono">{item.ip}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                              <div className="h-full bg-red-500 rounded" style={{ width: `${(item.count / (securityStats?.totalAttacks || 1)) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-foreground">攻击目标排行</span>
                  </div>
                  <div className="space-y-2">
                    {securityStats?.topAttackPaths && securityStats.topAttackPaths.length > 0 ? (
                      securityStats.topAttackPaths.slice(0, 10).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-foreground truncate flex-1 font-mono text-red-400">{item.path}</span>
                          <span className="text-xs text-muted-foreground ml-2">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 攻击日志表格 — 根据筛选过滤 */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-foreground">攻击记录</span>
                  {securityFilter && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs">
                      {securityFilter === "XSS" ? "XSS" :
                       securityFilter === "SQL_INJECTION" ? "SQL注入" :
                       securityFilter === "BRUTE_FORCE" ? "暴力破解" :
                       securityFilter === "WEAK_PASSWORD_ATTACK" ? "弱密码攻击" :
                       securityFilter === "PATH_TRAVERSAL" ? "路径穿越" :
                       securityFilter === "COMMAND_INJECTION" ? "命令注入" :
                       securityFilter === "SCANNER" ? "扫描探测" :
                       securityFilter === "SENSITIVE_ACCESS" ? "敏感访问" :
                       securityFilter} 筛选中
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {logsLoading ? "加载中..." : `${filteredLogs.length} 条记录`}
                  </span>
                  {securityFilter && (
                    <button onClick={() => { setSecurityFilter(null); setShowTrendDetail(false); setFilteredLogs(securityStats?.recentLogs || []); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3 w-3" />
                      清除筛选
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card">
                      <tr className="bg-muted/50 text-muted-foreground text-xs">
                        <th className="px-4 py-3 text-left font-medium">时间</th>
                        <th className="px-4 py-3 text-left font-medium">IP</th>
                        <th className="px-4 py-3 text-left font-medium">路径</th>
                        <th className="px-4 py-3 text-left font-medium">攻击类型</th>
                        <th className="px-4 py-3 text-left font-medium">载荷</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString("zh-CN") : "-"}
                          </td>
                          <td className="px-4 py-3 text-foreground font-mono whitespace-nowrap text-xs">{log.ip}</td>
                          <td className="px-4 py-3 text-red-400 font-mono truncate max-w-xs text-xs" title={log.path}>{log.path}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.attackType === "XSS" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              log.attackType === "SQL_INJECTION" ? "bg-pink-100 text-purple-600 dark:bg-purple-900/30 dark:text-pink-400" :
                              log.attackType === "BRUTE_FORCE" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" :
                              log.attackType === "PATH_TRAVERSAL" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                              log.attackType === "COMMAND_INJECTION" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                              log.attackType === "SCANNER" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                              log.attackType === "SENSITIVE_ACCESS" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}>{log.attackType === "XSS" ? "XSS" :
                               log.attackType === "SQL_INJECTION" ? "SQL注入" :
                               log.attackType === "BRUTE_FORCE" ? "暴力破解" :
                               log.attackType === "PATH_TRAVERSAL" ? "路径穿越" :
                               log.attackType === "COMMAND_INJECTION" ? "命令注入" :
                               log.attackType === "SCANNER" ? "扫描探测" :
                               log.attackType === "SENSITIVE_ACCESS" ? "敏感访问" :
                               log.attackType}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs truncate max-w-md" title={log.payload}>
                            {log.payload && log.payload.length > 80 ? log.payload.substring(0, 80) + "..." : (log.payload || "-")}
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>{logsLoading ? "加载中..." : "暂无攻击记录，系统运行安全"}</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* 威胁特征库 */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
                  <Bug className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">威胁特征库</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs">
                    {threats.length} 未审核
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {threatsLoading ? "加载中..." : `${threats.length} 条记录`}
                  </span>
                  <button onClick={loadThreats}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    刷新
                  </button>
                </div>
                <div className="overflow-x-auto">
                  {threats.length === 0 && !threatsLoading ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Bug className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>暂无待审核的威胁记录</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {threats.map(threat => (
                        <div key={threat.id} className="p-4 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-mono font-medium text-foreground">{threat.ip}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  threat.riskLevel === "critical" ? "bg-red-500/10 text-red-500" :
                                  threat.riskLevel === "high" ? "bg-orange-500/10 text-orange-500" :
                                  "bg-yellow-500/10 text-yellow-600"
                                }`}>
                                  {threat.riskLevel === "critical" ? "严重" :
                                   threat.riskLevel === "high" ? "高危" : "中危"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                                  {threat.attackCount} 次攻击
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                类型: {threat.attackTypes} · UA: {threat.userAgent?.substring(0, 60) || "-"}
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                记录时间: {threat.createdAt ? new Date(threat.createdAt).toLocaleString("zh-CN") : "-"}
                              </div>
                              {threat.payloads && (
                                <div className="bg-muted/30 rounded-lg p-2 font-mono text-xs text-muted-foreground max-h-24 overflow-y-auto">
                                  {threat.payloads.split("||").map((p, i) => (
                                    <div key={i} className="truncate">{i + 1}. {p}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <input
                                type="text"
                                placeholder="填写分析备注..."
                                value={threatReviewNote[threat.id] || ""}
                                onChange={e => setThreatReviewNote(prev => ({ ...prev, [threat.id]: e.target.value }))}
                                className="px-2 py-1 rounded border border-border bg-card text-xs text-foreground w-40 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                              <button onClick={() => markThreatReviewed(threat.id)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-xs hover:bg-orange-500/20 transition-colors">
                                标记已审核
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
