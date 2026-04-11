import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { Shield, Code, BookOpen, Github, ExternalLink, ArrowRight, Zap, FileText, Terminal, Cpu, Globe, Sparkles, Eye, MessageSquare } from "lucide-react";
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
    console.log("Backend stats response:", data);
    if (data.code === 0) {
      console.log("Returning stats data:", data.data);
      console.log("totalComments =", data.data.totalComments);
      console.log("totalViews =", data.data.totalViews);
      return data.data;
    } else {
      return { totalPosts: 0, totalTags: 0, totalComments: 0, totalViews: 0 };
    }
  } catch { 
    console.error("getStats failed");
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
  
  const siteTitle = getSettingValue(settings, "site_title", "Aston's Blog");
  const siteDescription = getSettingValue(settings, "site_description", "DevSecOps 实践者 · 佛山大学");
  const siteSubtitle = getSettingValue(settings, "site_subtitle", "分享前端开发、后端架构、网络安全和 DevOps 的实践经验");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-float absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl" />
            <div className="animate-float-delayed absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 blur-3xl" />
            <div className="animate-float absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-400/10 to-orange-400/10 blur-3xl" />
          </div>

          <div className="container relative mx-auto px-4 py-20 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-2 text-sm shadow-sm backdrop-blur-sm animate-fade-in">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span className="text-muted-foreground">{siteDescription}</span>
              </div>

              {/* Main heading */}
              <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
                探索技术的
                <br />
                <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  无限可能
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
{siteSubtitle}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
                >
                  <FileText className="h-4 w-4" />
                  浏览文章
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/tools"
                  className="inline-flex items-center gap-2 rounded-xl border bg-card px-7 py-3.5 font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Shield className="h-4 w-4" />
                  安全工具箱
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-muted-foreground/30">
              <div className="mt-2 h-2 w-1 rounded-full bg-muted-foreground/50" />
            </div>
          </div>
        </section>

        {/* Tech Stack Marquee */}
        <section className="border-y bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {[
                { icon: Code, label: "Next.js" },
                { icon: Terminal, label: "Spring Boot" },
                { icon: Shield, label: "网络安全" },
                { icon: Cpu, label: "DevOps" },
                { icon: Globe, label: "React" },
                { icon: Code, label: "TypeScript" },
                { icon: Terminal, label: "MySQL" },
                { icon: Shield, label: "CTF" },
              ].map((tech, i) => {
                const Icon = tech.icon;
                return (
                  <span key={i} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-indigo-500" />
                    {tech.label}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section>
          <div className="container mx-auto px-4 py-16">
             <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
               {[
                 { label: "文章", value: stats.totalPosts || 0, icon: FileText, color: "from-indigo-500 to-blue-500" },
                 { label: "标签", value: stats.totalTags || 0, icon: Code, color: "from-purple-500 to-pink-500" },
                 { label: "评论", value: stats.totalComments || 0, icon: MessageSquare, color: "from-cyan-500 to-teal-500" },
                 { label: "阅读", value: stats.totalViews || 0, icon: Eye, color: "from-orange-500 to-red-500" },
               ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg card-hover glow-card"
                  >
                    <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-extrabold gradient-text">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <div className="container mx-auto px-4 pb-16">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/tools", icon: Shield, label: "安全工具箱", desc: "编码、加密、信息收集", color: "from-blue-500 to-cyan-500" },
                { href: "/timeline", icon: Zap, label: "成长轨迹", desc: "学习历程与技能树", color: "from-emerald-500 to-teal-500" },
                { href: "/terminal", icon: Terminal, label: "终端", desc: "命令行彩蛋", color: "from-green-500 to-emerald-500" },
                { href: "/resources", icon: ExternalLink, label: "推荐资源", desc: "学习平台、AI 工具", color: "from-rose-500 to-pink-500" },
                { href: "https://github.com/", icon: Github, label: "GitHub", desc: "开源项目与代码", color: "from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-700", external: true },
                { href: "https://www.bilibili.com/", icon: ExternalLink, label: "Bilibili", desc: "视频学习资源", color: "from-pink-500 to-rose-500", external: true },
              ].map((item, i) => {
                const Icon = item.icon;
                const Comp = item.external ? "a" : Link;
                return (
                  <Comp
                    key={i}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg card-hover glow-card"
                  >
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="mb-1 font-semibold group-hover:text-indigo-500 transition-colors">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </Comp>
                );
              })}
            </div>
          </div>
        </section>

        {/* Latest Posts */}
        <section>
          <div className="container mx-auto px-4 pb-20">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">最新文章</h2>
                <p className="text-sm text-muted-foreground">最新的技术分享与思考</p>
              </div>
              <Link href="/blog" className="group flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
                查看全部
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            {posts.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border bg-card py-20 text-center shadow-sm glow-card">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-400/10 blur-2xl" />
                  <div className="animate-float-delayed absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-400/10 blur-2xl" />
                </div>
                <div className="relative">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
                    <FileText className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">暂无文章</h3>
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
