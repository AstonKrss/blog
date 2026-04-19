"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import { Users, FileText, MessageCircle, Eye, BarChart3, Globe, Clock, Monitor, MapPin, Cpu, Terminal, Activity, Server } from "lucide-react";
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

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "traffic" | "users">("overview");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
      return;
    }

    if (user && user.role === "ADMIN") {
      const token = localStorage.getItem("token");
      Promise.all([
        fetch(`${API_BASE}/api/public/stats`).then(r => r.json()),
        fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE}/api/analytics/visits`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
      ]).then(([statsRes, usersRes, analyticsRes]) => {
        if (statsRes.code === 0) setStats(statsRes.data);
        if (usersRes.code === 0) setUsers(usersRes.data);
        if (analyticsRes.code === 0) setAnalytics(analyticsRes.data);
      }).catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground flex items-center gap-2">
            <Terminal className="h-4 w-4" /> 初始化系统监控...
          </div>
        </main>
        <Footer />
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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      <main className="flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-green-500/5 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[80px]" />
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,255,0,0.15) 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20 border border-green-500/50">
                <Server className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-500 font-mono">ADMIN SYSTEM</h1>
                <p className="text-xs text-green-500/60 font-mono">&gt; 站点运维监控面板</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-500/60 font-mono">
              <span className="animate-pulse">●</span>
              SYSTEM ONLINE
            </div>
          </div>

          <div className="flex gap-1 mb-6 p-1 bg-black/50 rounded-lg border border-green-500/30 inline-flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                    activeTab === tab.id 
                      ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                      : "text-green-500/60 hover:text-green-500 hover:bg-green-500/10"
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
                { label: "TOTAL_USERS", value: users.length, icon: Users, color: "cyan" },
                { label: "TOTAL_POSTS", value: stats?.totalPosts || 0, icon: FileText, color: "blue" },
                { label: "COMMENTS", value: stats?.totalComments || 0, icon: MessageCircle, color: "purple" },
                { label: "PAGE_VIEWS", value: stats?.totalViews || 0, icon: Eye, color: "green" },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="group relative overflow-hidden rounded-lg bg-black/50 border border-green-500/30 p-4 hover:border-green-500/60 transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-500/60 font-mono mb-1">{card.label}</p>
                        <p className="text-2xl font-bold text-green-500 font-mono">{card.value.toLocaleString()}</p>
                      </div>
                      <Icon className={`h-8 w-8 text-${card.color}-500/50`} />
                    </div>
                  </div>
                );
              })}

              <div className="col-span-full rounded-lg bg-black/50 border border-green-500/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-mono">实时流量监控</span>
                </div>
                <div className="h-32 flex items-end gap-1">
                  {analytics?.hourlyDistribution?.slice(0, 24).map((hour, i) => {
                    const maxCount = Math.max(...(analytics?.hourlyDistribution || [{count: 1}]).map(h => h.count), 1);
                    const height = (hour.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 bg-green-500/20 border border-green-500/50 hover:bg-green-500/40 transition-all" style={{ height: `${Math.max(height, 4)}%` }} title={`${hour.hour}:00 - ${hour.count}次`} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-green-500/40 font-mono">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:59</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "traffic" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-black/50 border border-green-500/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-mono">GEO_DISTRIBUTION</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topCountries?.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-green-500/50" />
                        <span className="text-sm text-green-500/80 font-mono">{item.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-green-500/20 rounded overflow-hidden">
                          <div className="h-full bg-green-500/60" style={{ width: `${(item.count / (analytics?.totalVisits || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-green-500/60 font-mono w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-black/50 border border-green-500/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-mono">ISP_DISTRIBUTION</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topIsps?.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-green-500/50" />
                        <span className="text-sm text-green-500/80 font-mono">{item.isp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-green-500/20 rounded overflow-hidden">
                          <div className="h-full bg-cyan-500/60" style={{ width: `${(item.count / (analytics?.totalVisits || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-green-500/60 font-mono w-12 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-black/50 border border-green-500/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-mono">TOP_PAGES</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topPages?.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-green-500/80 font-mono truncate flex-1">{item.path}</span>
                      <span className="text-xs text-green-500/60 font-mono">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-black/50 border border-green-500/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500 font-mono">TOP_IP_ADDRESSES</span>
                </div>
                <div className="space-y-2">
                  {analytics?.topIps?.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-green-500/80 font-mono">{item.ip}</span>
                      <span className="text-xs text-green-500/60 font-mono">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="rounded-lg bg-black/50 border border-green-500/30 overflow-hidden">
              <div className="p-4 border-b border-green-500/30 flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500 font-mono">USER_DATABASE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-green-500/10 text-green-500/80 text-xs font-mono">
                      <th className="px-4 py-2 text-left">USER</th>
                      <th className="px-4 py-2 text-left">EMAIL</th>
                      <th className="px-4 py-2 text-left">ROLE</th>
                      <th className="px-4 py-2 text-left">REGISTERED</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-mono">
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-green-500/20 hover:bg-green-500/5">
                        <td className="px-4 py-2 text-green-500/80">{u.displayName || u.username}</td>
                        <td className="px-4 py-2 text-green-500/60">{u.email}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            u.role === "ADMIN" ? "bg-red-500/20 text-red-500" :
                            u.role === "AUTHOR" ? "bg-blue-500/20 text-blue-500" :
                            "bg-gray-500/20 text-gray-500"
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-2 text-green-500/60">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("zh-CN") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}