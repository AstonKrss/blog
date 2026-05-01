"use client"
import { getToken, clearToken } from "@/lib/token"

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import { Users, FileText, MessageCircle, Eye, BarChart3, Globe, Clock, Monitor, MapPin, Cpu, Terminal, Activity, Server, Shield, AlertTriangle, Bug, Skull, Key } from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  createdAt: string;
}

interface SecurityStats {
  totalAttacks: number;
  todayCount: number;
  // 各类攻击数量
  xssCount: number;
  sqlInjectionCount: number;
  bruteForceCount: number;
  weakPasswordCount: number;
  pathTraversalCount: number;
  commandInjectionCount: number;
  scannerCount: number;
  sensitiveAccessCount: number;
  otherCount: number;
  // 统计数据
  topAttackers: { ip: string; count: number; lastAttack: string }[];
  topAttackPaths: { path: string; count: number }[];
  attackTrend: { date: string; count: number }[];
  recentLogs: SecurityLog[];
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
        if (securityRes.code === 0) setSecurityStats(securityRes.data);
      }).catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

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

  if (!user || user.role !== "ADMIN") {
    return null;
  }

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
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
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

          <div className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-xl inline-flex border border-border">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === tab.id 
                      ? "bg-background text-foreground shadow-sm border border-border" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "overview" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "用户总数", value: users.length, icon: Users, gradient: "from-cyan-500 to-blue-500" },
                { label: "文章总数", value: stats?.totalPosts || 0, icon: FileText, gradient: "from-blue-500 to-indigo-500" },
                { label: "评论总数", value: stats?.totalComments || 0, icon: MessageCircle, gradient: "from-purple-500 to-pink-500" },
                { label: "总阅读量", value: stats?.totalViews || 0, icon: Eye, gradient: "from-orange-500 to-red-500" },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="group relative overflow-hidden rounded-2xl border bg-card p-5 hover:shadow-lg transition-all">
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                        <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                      </div>
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg opacity-80`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="col-span-full rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-foreground">24小时访问趋势</span>
                </div>
                <div className="h-32 flex items-end gap-1">
                  {analytics?.hourlyDistribution?.slice(0, 24).map((hour, i) => {
                    const maxCount = Math.max(...(analytics?.hourlyDistribution || [{count: 1}]).map(h => h.count), 1);
                    const height = (hour.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 bg-gradient-to-t from-indigo-500/20 to-indigo-500/60 rounded-t hover:from-indigo-500/30 hover:to-indigo-500/80 transition-all" style={{ height: `${Math.max(height, 4)}%` }} title={`${hour.hour}:00 - ${hour.count}次`} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:59</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "traffic" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-indigo-500" />
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
                        <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded" style={{ width: `${(item.count / (analytics?.totalVisits || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-foreground">运营商</span>
                </div>
                <div className="space-y-3">
                  {analytics?.topIsps?.slice(0, 8).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">{item.isp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded" style={{ width: `${(item.count / (analytics?.totalVisits || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-foreground">热门页面</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topPages?.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate flex-1 font-mono">{item.path}</span>
                      <span className="text-xs text-muted-foreground ml-2">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-foreground">访问IP排行</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topIps?.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-mono">{item.ip}</span>
                      <span className="text-xs text-muted-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-foreground">用户列表</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-xs">
                      <th className="px-4 py-3 text-left font-medium">用户</th>
                      <th className="px-4 py-3 text-left font-medium">邮箱</th>
                      <th className="px-4 py-3 text-left font-medium">角色</th>
                      <th className="px-4 py-3 text-left font-medium">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-foreground">{u.displayName || u.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "ADMIN" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                            u.role === "AUTHOR" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
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
              {/* 安全统计卡片 - 第一行 */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">攻击总数</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.totalAttacks || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg opacity-80">
                      <Skull className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
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
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SQL注入</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.sqlInjectionCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg opacity-80">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
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
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
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
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">今日攻击</p>
                      <p className="text-2xl font-bold text-foreground">{securityStats?.todayCount || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg opacity-80">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 安全统计卡片 - 第二行：其他攻击类型 */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-red-500/10">
                      <FileText className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">路径穿越</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.pathTraversalCount || 0}</p>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-orange-500/10">
                      <Terminal className="h-3 w-3 text-orange-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">命令注入</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.commandInjectionCount || 0}</p>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-blue-500/10">
                      <Activity className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">扫描探测</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.scannerCount || 0}</p>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-gray-500/10">
                      <Monitor className="h-3 w-3 text-gray-500" />
                    </div>
                    <span className="text-xs text-muted-foreground">其他</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{securityStats?.otherCount || 0}</p>
                </div>
              </div>

              {/* 攻击趋势图 */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-foreground">7天攻击趋势</span>
                </div>
                <div className="h-40 flex items-end gap-2">
                  {securityStats?.attackTrend?.map((item: any, i: number) => {
                    const maxCount = Math.max(...(securityStats?.attackTrend || [{count: 1}]).map((h: any) => h.count), 1);
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-gradient-to-t from-red-500/30 to-red-500 rounded-t hover:from-red-500/50 hover:to-red-500 transition-all cursor-pointer"
                          style={{ height: `${Math.max(height, 4)}%`, minHeight: '4%' }}
                          title={`${item.date}: ${item.count}次`}
                        />
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                    );
                  })}
                  {(!securityStats?.attackTrend || securityStats.attackTrend.length === 0) && (
                    <div className="flex-1 h-full flex items-center justify-center text-muted-foreground text-sm">
                      暂无数据
                    </div>
                  )}
                </div>
              </div>

              {/* 攻击排行 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Monitor className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-foreground">攻击者排行</span>
                  </div>
                  <div className="space-y-3">
                    {securityStats?.topAttackers?.slice(0, 8).map((item: any, i: number) => (
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
                    ))}
                    {(!securityStats?.topAttackers || securityStats.topAttackers.length === 0) && (
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
                    {securityStats?.topAttackPaths?.slice(0, 10).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-foreground truncate flex-1 font-mono text-red-400">{item.path}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.count}</span>
                      </div>
                    ))}
                    {(!securityStats?.topAttackPaths || securityStats.topAttackPaths.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">暂无数据</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 最近攻击日志 */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-foreground">最近攻击记录</span>
                  <span className="ml-auto text-xs text-muted-foreground">仅显示最近 50 条</span>
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
                      {securityStats?.recentLogs?.map(log => (
                        <tr key={log.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-4 py-3 text-foreground font-mono whitespace-nowrap">{log.ip}</td>
                          <td className="px-4 py-3 text-red-400 font-mono truncate max-w-xs" title={log.path}>{log.path}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.attackType === "XSS" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              log.attackType === "SQL_INJECTION" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                              log.attackType === "BRUTE_FORCE" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" :
                              log.attackType === "PATH_TRAVERSAL" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                              log.attackType === "COMMAND_INJECTION" ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" :
                              log.attackType === "SCANNER" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}>{log.attackType === "XSS" ? "XSS" : 
                               log.attackType === "SQL_INJECTION" ? "SQL注入" : 
                               log.attackType === "BRUTE_FORCE" ? "暴力破解" :
                               log.attackType === "PATH_TRAVERSAL" ? "路径穿越" :
                               log.attackType === "COMMAND_INJECTION" ? "命令注入" :
                               log.attackType === "SCANNER" ? "扫描探测" :
                               log.attackType}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs truncate max-w-md" title={log.payload}>
                            {log.payload.length > 60 ? log.payload.substring(0, 60) + "..." : log.payload || "-"}
                          </td>
                        </tr>
                      ))}
                      {(!securityStats?.recentLogs || securityStats.recentLogs.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>暂无攻击记录，系统运行安全</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}