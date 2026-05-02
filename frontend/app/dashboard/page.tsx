"use client"
import { getToken, clearToken } from "@/lib/token"

import { useAuth } from "@/components/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Settings, User, Plus, PenTool, BarChart3, Sparkles, MessageSquare, Eye, Link2, Code, Image } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Stats {
  posts: number;
  views: number;
  comments: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ posts: 0, views: 0, comments: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getToken();
        console.log("Dashboard - Token:", token);
        const res = await fetch(`${API_BASE}/api/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Dashboard - Response status:", res.status);
        const data = await res.json();
        console.log("Dashboard - Response data:", data);
         if (data.code === 0 && data.data) {
           const posts = data.data.posts || [];
           const totalViews = posts.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0);
           const totalComments = posts.reduce((sum: number, p: any) => sum + (p.commentCount || 0), 0);
           setStats({ posts: posts.length, views: totalViews, comments: totalComments });
         } else {
           console.log("Failed to fetch posts:", data.message);
         }
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    if (user) fetchStats();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>;
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const isAuthor = user.role === "ADMIN" || user.role === "AUTHOR";

  const quickActions = [
    ...(isAuthor ? [{ href: "/dashboard/write", icon: PenTool, label: "写文章", desc: "创作新的技术文章", gradient: "from-rose-500 to-blue-500" }] : []),
    ...(isAuthor ? [{ href: "/dashboard/posts", icon: FileText, label: "文章管理", desc: "管理所有已发布的文章", gradient: "from-pink-500 to-pink-500" }] : []),
    ...(isAdmin ? [{ href: "/dashboard/projects", icon: Code, label: "项目管理", desc: "管理作品集项目", gradient: "from-emerald-500 to-teal-500" }] : []),
    ...(isAdmin ? [{ href: "/dashboard/photos", icon: Image, label: "照片管理", desc: "上传和管理照片", gradient: "from-pink-500 to-rose-500" }] : []),
    ...(isAdmin ? [{ href: "/dashboard/friends", icon: Link2, label: "友链管理", desc: "审核友链申请", gradient: "from-cyan-500 to-teal-500" }] : []),
    { href: "/dashboard/profile", icon: User, label: "个人资料", desc: "编辑个人信息和头像", gradient: "from-orange-500 to-amber-500" },
    ...(isAdmin ? [{ href: "/dashboard/settings", icon: Settings, label: "站点设置", desc: "管理博客基本配置", gradient: "from-slate-500 to-zinc-500" }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 -right-32 h-96 w-96 rounded-full bg-rose-400/10 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pink-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-8">
          {/* Welcome Section */}
          <div className="relative overflow-hidden mb-8 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 p-8 text-white shadow-xl glow-card">
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm text-white/80">控制台</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">欢迎回来，{user.displayName || user.username}</h1>
                <p className="text-white/70">今天想做点什么？</p>
              </div>
              <Link
                href="/dashboard/write"
                className="flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-5 py-3 font-medium hover:bg-white/30 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Plus className="h-5 w-5" />
                写文章
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg card-hover glow-card"
                >
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-rose-500 transition-colors">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">{action.desc}</p>
                </Link>
              );
            })}
          </div>

          {/* Stats */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">概览</h2>
            </div>
            {loadingStats ? (
              <div className="text-center py-4 text-muted-foreground">加载中...</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "文章", value: stats.posts, gradient: "from-rose-500 to-blue-500", icon: FileText },
                  { label: "评论", value: stats.comments, gradient: "from-emerald-500 to-teal-500", icon: MessageSquare },
                  { label: "阅读", value: stats.views, gradient: "from-orange-500 to-amber-500", icon: Eye },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="text-center p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20">
                      <Icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <div className={`text-3xl font-extrabold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
