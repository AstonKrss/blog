import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { Typewriter } from "@/components/typewriter";
import { SkillShowcase } from "@/components/skill-showcase";
import { RandomQuote } from "@/components/random-quote";
import { VisitorInteraction } from "@/components/visitor-interaction";
import ScrollLock from "@/components/scroll-lock";
import { LazyIframe } from "@/components/lazy-iframe";
import {
  Shield, Code, BookOpen, Github, ExternalLink, ArrowRight, Zap,
  FileText, Terminal, Globe, Sparkles, Eye, MessageSquare, Heart,
  Rocket, Star, Flame, Compass, Layers, User, Rss, TrendingUp, Clock
} from "lucide-react";
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
    if (data.code === 0) return data.data;
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
      for (const s of data.data.settings) map[s.settingKey] = s.settingValue;
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
    <div className="min-h-screen flex flex-col overflow-hidden">
      <Header />
      <ScrollLock />
      <main className="flex-1">

        {/* ══════════════════════════════════════════
            HERO SECTION — Full-width cinematic
        ══════════════════════════════════════════ */}
        <section className="relative min-h-[92vh] flex items-center">
          {/* Side decorations */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Left vertical accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-rose-500/20 to-transparent" />
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-rose-500/10 to-transparent" style={{ left: 4 }} />

            {/* Right vertical accent line */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-pink-500/20 to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-pink-500/10 to-transparent" style={{ right: 4 }} />

            {/* Large ambient orbs */}
            <div className="absolute -top-60 -left-60 w-[900px] h-[900px] rounded-full bg-gradient-to-br from-rose-600/20 via-pink-500/15 to-orange-500/10 blur-[180px] animate-[float-slow_15s_ease-in-out_infinite]" />
            <div className="absolute -bottom-60 -right-60 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-yellow-500/5 blur-[150px] animate-[float-slow_18s_ease-in-out_infinite_3s]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-pink-500/12 via-rose-500/8 to-transparent blur-[120px] animate-[pulse-slow_8s_ease-in-out_infinite]" />

            {/* Decorative corner shapes */}
            <div className="absolute top-20 left-8 w-24 h-24 border border-rose-500/10 rotate-45 rounded-sm animate-[spin-slow_30s_linear_infinite]" />
            <div className="absolute bottom-20 right-8 w-16 h-16 border border-pink-500/10 rotate-12 rounded-sm animate-[spin-slow_20s_linear_infinite_reverse]" />

            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-[0.025]">
              <div className="absolute left-[15%] top-0 bottom-0 w-px bg-foreground/30" />
              <div className="absolute left-[30%] top-0 bottom-0 w-px bg-foreground/20" />
              <div className="absolute left-[70%] top-0 bottom-0 w-px bg-foreground/20" />
              <div className="absolute left-[85%] top-0 bottom-0 w-px bg-foreground/30" />
            </div>
          </div>

          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left: Text content */}
              <div className="lg:col-span-7 space-y-8">
                {/* Status badge */}
                <div className="inline-flex items-center gap-3 rounded-full glass-card px-5 py-2.5 shadow-lg border border-rose-200/50 dark:border-rose-800/30 animate-[bounce-in_0.8s_cubic-bezier(0.175,0.885,0.32,1.275)_both]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">{siteDescription}</span>
                </div>

                {/* Main headline */}
                <div className="space-y-4">
                  <h1 className="text-6xl sm:text-7xl lg:text-[5rem] font-black tracking-tighter leading-[0.92] animate-[fade-in-up_0.8s_cubic-bezier(0.25,0.1,0.25,1)_0.1s_both]">
                    <span className="block text-foreground">探索技术的</span>
                    <span className="block bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                      无限可能
                    </span>
                  </h1>

                  {/* Typewriter */}
                  <div className="text-2xl sm:text-3xl text-muted-foreground animate-[fade-in-up_0.8s_cubic-bezier(0.25,0.1,0.25,1)_0.2s_both]">
                    <Typewriter />
                  </div>
                </div>

                {/* Description */}
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl animate-[fade-in-up_0.8s_cubic-bezier(0.25,0.1,0.25,1)_0.3s_both]">
                  {siteSubtitle}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 animate-[fade-in-up_0.8s_cubic-bezier(0.25,0.1,0.25,1)_0.4s_both]">
                  <Link
                    href="/blog"
                    className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-8 py-4 font-bold text-white shadow-2xl shadow-rose-500/30 transition-all duration-300 hover:shadow-3xl hover:shadow-rose-500/40 hover:-translate-y-1 hover:scale-105 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <FileText className="h-5 w-5 relative z-10" />
                    <span className="relative z-10">浏览文章</span>
                    <ArrowRight className="h-5 w-5 relative z-10 transition-transform group-hover:translate-x-2" />
                  </Link>
                  <Link
                    href="/tools"
                    className="group relative inline-flex items-center gap-3 rounded-2xl glass-card border border-border/50 px-8 py-4 font-bold shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Shield className="h-5 w-5 text-rose-500 relative z-10" />
                    <span className="relative z-10">安全工具箱</span>
                    <Rocket className="h-5 w-5 text-orange-400 relative z-10 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/about"
                    className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                  >
                    <User className="h-4 w-4" />
                    <span>关于我</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* Right: Bento stats */}
              <div className="lg:col-span-5 animate-[fade-in-right_0.8s_cubic-bezier(0.25,0.1,0.25,1)_0.2s_both]">
                <div className="grid grid-cols-2 gap-3">
                  {/* Large featured stat */}
                  <div className="col-span-2 rounded-2xl glass-card p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-400 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-400" />
                    <div className="relative flex items-center gap-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30">
                        <FileText className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <div className="text-4xl font-black text-foreground">{stats.totalPosts || 0}</div>
                        <div className="text-sm text-muted-foreground font-medium">技术文章</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-4xl font-black bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">+</div>
                        <div className="text-xs text-muted-foreground">持续更新</div>
                      </div>
                    </div>
                  </div>

                  {/* Small stats */}
                  {[
                    { label: "标签", value: stats.totalTags || 0, icon: Code, gradient: "from-orange-500 to-amber-400", accent: "text-orange-500" },
                    { label: "评论", value: stats.totalComments || 0, icon: MessageSquare, gradient: "from-pink-500 to-rose-500", accent: "text-pink-500" },
                    { label: "阅读", value: stats.totalViews || 0, icon: Eye, gradient: "from-orange-400 to-yellow-400", accent: "text-orange-400" },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div key={i} className="rounded-2xl glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-400 cursor-default">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-400" />
                        <Icon className={`h-5 w-5 mb-3 ${stat.accent}`} />
                        <div className="text-2xl font-black text-foreground mb-0.5">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-[bounce_2s_ease-in-out_infinite]">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">Scroll</span>
                <div className="w-6 h-10 rounded-full border-2 border-rose-500/30 flex items-start justify-center p-1.5">
                  <div className="w-1.5 h-3 rounded-full bg-gradient-to-b from-rose-500 to-pink-500 animate-[scroll-indicator_2s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION DIVIDER
        ══════════════════════════════════════════ */}
        <div className="relative h-px mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
        </div>

        {/* ══════════════════════════════════════════
            RANDOM QUOTE — Full width with accent
        ══════════════════════════════════════════ */}
        <section className="py-10 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-rose-500/[0.03] to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-pink-500/[0.03] to-transparent" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RandomQuote />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SKILLS BENTO GRID
        ══════════════════════════════════════════ */}
        <section className="py-20 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-500/8 to-pink-500/5 blur-[120px]" />
            <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/8 to-amber-500/5 blur-[100px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-lg shadow-rose-500/30">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black">技术栈</h2>
                <p className="text-sm text-muted-foreground">点击分类切换查看我的技能树</p>
              </div>
            </div>
            <SkillShowcase />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TERMINAL — Full width feature section
        ══════════════════════════════════════════ */}
        <section id="terminal" className="py-16 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
            <div className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-green-500/[0.03] to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-green-500/[0.03] to-transparent" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
                  <Terminal className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">终端</h2>
                  <p className="text-sm text-muted-foreground">试试输入命令探索博客</p>
                </div>
              </div>
              <Link
                href="/terminal"
                className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all group"
              >
                <span>全屏模式</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0a1a0f] border-b border-green-500/20">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-green-500/60 ml-2 font-mono">aston@blog:~</span>
              </div>
              <LazyIframe
                src="/terminal"
                title="Interactive Terminal"
                className="rounded-b-2xl overflow-hidden"
                style={{ height: "500px" }}
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            QUICK LINKS BENTO GRID — 4-column asymmetric
        ══════════════════════════════════════════ */}
        <section className="py-20 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-pink-500/8 to-rose-500/5 blur-[100px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30">
                <Compass className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl font-black">快速入口</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Large feature cards */}
              <Link
                href="/tools"
                className="col-span-2 group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20 min-h-[180px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30 mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black mb-1">安全工具箱</h3>
                  <p className="text-sm text-muted-foreground mb-4">编码 · 加密 · 信息收集 · 漏洞检测</p>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-rose-500">
                    <span>开始使用</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
                {/* Decorative shapes */}
                <div className="absolute top-4 right-4 w-16 h-16 border border-rose-500/10 rotate-12 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="absolute bottom-4 right-4 w-10 h-10 border border-pink-500/10 -rotate-6 opacity-0 group-hover:opacity-100 transition-all duration-700" />
              </Link>

              <Link
                href="/timeline"
                className="group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black mb-1">成长轨迹</h3>
                  <p className="text-sm text-muted-foreground">学习历程与技能树</p>
                </div>
              </Link>

              <Link
                href="/terminal"
                className="group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/15 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Terminal className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black mb-1">终端彩蛋</h3>
                  <p className="text-sm text-muted-foreground">命令行探索</p>
                </div>
              </Link>

              <Link
                href="/resources"
                className="group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/15 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-yellow-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110">
                    <ExternalLink className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black mb-1">推荐资源</h3>
                  <p className="text-sm text-muted-foreground">学习平台·AI工具</p>
                </div>
              </Link>

              <Link
                href="/archive"
                className="group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/15 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black mb-1">归档</h3>
                  <p className="text-sm text-muted-foreground">按时间整理</p>
                </div>
              </Link>

              <Link
                href="/projects"
                className="col-span-2 group relative overflow-hidden rounded-2xl glass-card border border-border/50 p-6 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="relative flex items-center gap-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg transition-transform duration-300 group-hover:scale-110 shrink-0">
                    <Code className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black mb-1">项目作品</h3>
                    <p className="text-sm text-muted-foreground">安全工具、博客系统、数据分析</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-rose-500 shrink-0">
                    <span>查看</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            VISITOR INTERACTION
        ══════════════════════════════════════════ */}
        <section className="py-12 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-black">互动区域</h2>
            </div>
            <VisitorInteraction />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            LATEST POSTS — Bento grid
        ══════════════════════════════════════════ */}
        <section className="pb-24 relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-500/8 to-pink-500/5 blur-[120px]" />
            <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/8 to-amber-500/5 blur-[100px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-lg shadow-rose-500/30">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">最新文章</h2>
                  <p className="text-sm text-muted-foreground">探索最新的技术见解与分享</p>
                </div>
              </div>
              <Link
                href="/blog"
                className="group hidden sm:inline-flex items-center gap-2 rounded-xl glass-card px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                查看全部
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Featured post — spans 2 columns */}
                <div className="md:col-span-2 lg:col-span-1 lg:row-span-2 animate-[fade-in-up_0.6s_cubic-bezier(0.25,0.1,0.25,1)_0s_both]">
                  <PostCard post={posts[0]} index={0} featured />
                </div>
                {/* Rest */}
                {posts.slice(1).map((post: any, i: number) => (
                  <div key={post.id} className="animate-[fade-in-up_0.6s_cubic-bezier(0.25,0.1,0.25,1)_both]" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                    <PostCard post={post} index={i + 1} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl glass-card py-24 text-center shadow-lg">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="animate-float absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
                  <div className="animate-float-delayed absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
                </div>
                <div className="relative">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
                    <BookOpen className="h-8 w-8 text-rose-500" />
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
