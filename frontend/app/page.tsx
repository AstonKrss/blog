import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { Typewriter } from "@/components/typewriter";
import { SkillShowcase } from "@/components/skill-showcase";
import { RandomQuote } from "@/components/random-quote";
import { VisitorInteraction } from "@/components/visitor-interaction";
import { Shield, Code, BookOpen, Github, ExternalLink, ArrowRight, Zap, FileText, Terminal, Cpu, Globe, Sparkles, Eye, MessageSquare, Heart, Rocket } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getPosts() {
  try {
    const res = await fetch(`${API_BASE}/api/public/posts?page=1&limit=6`, { next: { revalidate: 60 } });
    const data = await res.json();
    return data.code === 0 ? data.data?.posts || [] : [];
  } catch { return []; }
}

async function getStats() {
  try {
    const res = await fetch(`${API_BASE}/api/public/stats`, { next: { revalidate: 60 } });
    const data = await res.json();
    if (data.code === 0) {
      return data.data;
    }
    return { totalPosts: 0, totalTags: 0, totalComments: 0, totalViews: 0 };
  } catch { 
    return { totalPosts: 0, totalTags: 0, totalComments: 0, totalViews: 0 };
  }
}

async function getSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, { next: { revalidate: 60 } });
    const data = await res.json();
    if (data.code === 0 && data.data?.settings) {
      const map: Record<string, string> = {};
      for (const s of data.data.settings) {
        map[s.settingKey] = s.settingValue;
      }
      return map;
    }
    return {};
  } catch { return {}; }
}

function getSettingValue(settings: Record<string, string>, key: string, defaultValue: string): string {
  return settings[key] || defaultValue;
}

export default async function HomePage() {
  const posts = await getPosts();
  const stats = await getStats();
  const settings = await getSettings();
  
  const siteDescription = getSettingValue(settings, "site_description", "DevSecOps 实践者 · 佛山大学");
  const siteSubtitle = getSettingValue(settings, "site_subtitle", "分享前端开发、后端架构、网络安全和 DevOps 的实践经验");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section - Modern iOS Style */}
        <section className="relative overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-pink-500/10 blur-[100px] home-animate-pulse-slow" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/30 via-emerald-500/20 to-teal-500/10 blur-[100px] home-animate-pulse-slow-delayed" />
            <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-500/20 via-rose-500/10 to-red-500/5 blur-[80px] home-animate-pulse-slow" />
          </div>

          <div className="container relative mx-auto px-4 py-24 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge with glow */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/80 px-5 py-2.5 text-sm shadow-lg shadow-indigo-500/10 backdrop-blur-sm home-animate-bounce-in">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span className="text-muted-foreground">{siteDescription}</span>
              </div>

              {/* Main heading with gradient */}
              <h1 className="mb-4 text-4xl md:text-5xl lg:text-6xl font-black tracking-tight home-animate-fade-in-up">
                探索技术的
                <span className="block mt-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  无限可能
                </span>
              </h1>

              {/* Typewriter effect */}
              <div className="mb-6 text-lg md:text-xl text-muted-foreground home-animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                <Typewriter />
              </div>

              {/* Subtitle */}
              <p className="mx-auto mb-10 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed home-animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                {siteSubtitle}
              </p>

              {/* CTA Buttons with hover effects */}
              <div className="flex flex-wrap items-center justify-center gap-4 home-animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <Link
                  href="/blog"
                  className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-4 font-bold text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1 hover:scale-105"
                >
                  <FileText className="h-5 w-5" />
                  浏览文章
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/tools"
                  className="group relative inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card/80 px-8 py-4 font-bold shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:border-indigo-500/50 hover:shadow-xl"
                >
                  <Shield className="h-5 w-5 text-indigo-500" />
                  安全工具箱
                  <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="flex h-12 w-7 items-start justify-center rounded-full border-2 border-muted-foreground/30 bg-card/50 backdrop-blur-sm">
              <div className="mt-2 h-3 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 home-animate-scroll-indicator" />
            </div>
          </div>
        </section>

        {/* Stats Section - Card Grid */}
        <section>
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: "文章", value: stats.totalPosts || 0, icon: FileText, gradient: "from-indigo-500 to-blue-500", delay: "0s" },
                { label: "标签", value: stats.totalTags || 0, icon: Code, gradient: "from-purple-500 to-pink-500", delay: "0.1s" },
                { label: "评论", value: stats.totalComments || 0, icon: MessageSquare, gradient: "from-cyan-500 to-teal-500", delay: "0.2s" },
                { label: "阅读", value: stats.totalViews || 0, icon: Eye, gradient: "from-orange-500 to-red-500", delay: "0.3s" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-3xl border bg-card p-5 text-center shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl card-hover home-animate-stagger-in"
                    style={{ animationDelay: stat.delay }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`} />
                    
                    <div className={`relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="relative text-3xl font-black gradient-text mb-0.5">{stat.value}</div>
                    <div className="relative text-sm text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Random Quote Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <RandomQuote />
          </div>
        </section>

        {/* Visitor Interaction Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1">互动区域</h2>
              <p className="text-sm text-muted-foreground">来点有趣的吧~</p>
            </div>
            <VisitorInteraction />
          </div>
        </section>

        {/* Skills Section */}
        <section className="py-12 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent">
          <div className="container mx-auto px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black mb-2">技术栈</h2>
              <p className="text-muted-foreground">我的技能树，点击切换分类</p>
            </div>
            <SkillShowcase />
          </div>
        </section>

        {/* Terminal Section - Real Interactive Terminal */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-3xl font-black mb-2">终端</h2>
              <p className="text-muted-foreground">试试输入命令探索博客，或者点击快捷入口</p>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
              <iframe 
                src="/terminal" 
                className="w-full h-[600px] border-0 rounded-b-3xl"
                title="Interactive Terminal"
                sandbox="allow-same-origin allow-scripts"
              />
              <div className="text-center py-2 bg-muted/50 border-t border-gray-200 dark:border-gray-700">
                <a href="/terminal" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  打开完整终端 →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links - Feature Cards */}
        <section>
          <div className="container mx-auto px-4 pb-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/tools", icon: Shield, label: "安全工具箱", desc: "编码、加密、信息收集", gradient: "from-blue-500 to-cyan-500" },
                { href: "/timeline", icon: Zap, label: "成长轨迹", desc: "学习历程与技能树", gradient: "from-emerald-500 to-teal-500" },
                { href: "/terminal", icon: Terminal, label: "终端", desc: "命令行彩蛋", gradient: "from-green-500 to-emerald-500" },
                { href: "/resources", icon: ExternalLink, label: "推荐资源", desc: "学习平台、AI 工具", gradient: "from-rose-500 to-pink-500" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={i}
                    href={item.href}
                    className="group relative overflow-hidden rounded-3xl border bg-card p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl card-hover home-animate-stagger-in"
                    style={{ animationDelay: `${0.1 * i}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />
                    
                    <div className={`relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="relative mb-1 text-lg font-bold group-hover:text-indigo-500 transition-colors">{item.label}</h3>
                    <p className="relative text-sm text-muted-foreground">{item.desc}</p>
                    
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-indigo-500 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Latest Posts - Magazine Style */}
        <section>
          <div className="container mx-auto px-4 pb-20">
            <div className="mb-10 flex items-center justify-between">
              <div className="home-animate-fade-in-up">
                <h2 className="text-3xl font-black mb-2">最新文章</h2>
                <p className="text-muted-foreground">探索最新的技术见解与分享</p>
              </div>
              <Link 
                href="/blog" 
                className="group flex items-center gap-2 rounded-full border bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md home-animate-fade-in-up"
              >
                查看全部
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            {posts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post: any, i: number) => (
                  <div key={post.id} className="home-animate-fade-in-up" style={{ animationDelay: `${0.1 * i}s` }}>
                    <PostCard post={post} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl border bg-card py-24 text-center shadow-lg home-animate-fade-in">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
                </div>
                <div className="relative">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <FileText className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">暂无文章</h3>
                  <p className="text-muted-foreground">博主正在努力写作中，敬请期待...</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
