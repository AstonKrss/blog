"use client"
import { getToken } from "@/lib/token"
import { useState, useEffect, Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/auth-context";
import {
  Github, Mail, Code, Shield, Terminal, Heart, Sparkles,
  Camera, Save, Loader2, Globe, ArrowRight, MapPin, GraduationCap,
  ChevronDown, Calendar, BookOpen
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
}

function AboutContent() {
  const { user: currentUser } = useAuth();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: "", bio: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/users/admin`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0 && data.data) {
          setAdmin(data.data);
          setEditForm({
            displayName: data.data.displayName || "",
            bio: data.data.bio || "",
            avatarUrl: data.data.avatarUrl || ""
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!currentUser || currentUser.role !== "ADMIN") return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.code === 0) {
        setAdmin(data.data);
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin: boolean = currentUser?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<"about" | "timeline">("about");
  const [expandedYear, setExpandedYear] = useState<string | null>("2026");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const toggleYear = (year: string) => setExpandedYear(expandedYear === year ? null : year);
  const toggleSkill = (category: string) => setExpandedSkill(expandedSkill === category ? null : category);

  // Sync tab from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "timeline") setActiveTab("timeline");
  }, []);
  const displayName = admin?.displayName || admin?.username || "Aston";
  const bio = admin?.bio || "佛山大学计算机专业学生";
  const description = admin?.bio ? admin.bio : "热爱技术，专注于 DevSecOps 实践。这个博客是我分享技术学习心得、项目实践和安全研究的地方。";

  const techStack = [
    { category: "前端", icon: Code, items: ["Next.js", "React", "TypeScript", "Tailwind CSS"], gradient: "from-rose-500 to-blue-500" },
    { category: "后端", icon: Terminal, items: ["Spring Boot", "JPA", "MySQL", "Redis"], gradient: "from-emerald-500 to-teal-500" },
    { category: "DevOps", icon: Globe, items: ["Docker", "CI/CD", "Linux", "Nginx"], gradient: "from-orange-500 to-amber-500" },
    { category: "安全", icon: Shield, items: ["CTF", "渗透测试", "代码审计", "漏洞分析"], gradient: "from-pink-500 to-pink-500" },
  ];

  const links = [
    { name: "GitHub", url: "https://github.com/AstonKrss", icon: Github, gradient: "from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-700" },
    { name: "邮箱", url: admin?.email ? `mailto:${admin.email}` : "mailto:astonkrss@gmail.com", icon: Mail, gradient: "from-rose-500 to-orange-400" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-pink-500/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-500/8 to-teal-500/5 blur-[80px]" />
        </div>

        <div className="relative w-full px-4 py-14">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-10 border-b border-border/30">
            <button onClick={() => setActiveTab("about")}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === "about" ? "border-rose-500 text-rose-500" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              关于我
            </button>
            <button onClick={() => setActiveTab("timeline")}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === "timeline" ? "border-rose-500 text-rose-500" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              时间线
            </button>
          </div>

          {activeTab === "about" ? (
          <>
          {/* Profile card */}
          <div className="mb-12 relative overflow-hidden rounded-2xl glass-card shadow-xl animate-fade-in-up border-rose-500/10 hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-500 hover:-translate-y-1">
            {/* Gradient top */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-pink-500/10" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-rose-500/30 via-pink-500/30 to-pink-500/30" />

            <div className="relative p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="relative group">
                  {admin?.avatarUrl ? (
                    <img
                      src={admin.avatarUrl}
                      alt={displayName}
                      className="h-32 w-32 rounded-2xl object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 flex items-center justify-center text-4xl font-bold text-white shadow-2xl transition-transform duration-500 group-hover:scale-105">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-card flex items-center justify-center shadow-lg">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  {isEditing && isAdmin ? (
                    <div className="space-y-3 max-w-md">
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card shadow-sm text-center md:text-left focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50"
                        placeholder="昵称"
                      />
                      <input
                        type="text"
                        value={editForm.avatarUrl}
                        onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card shadow-sm text-center md:text-left focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50"
                        placeholder="头像URL"
                      />
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50"
                        rows={3}
                        placeholder="个人简介"
                      />
                      <div className="flex gap-2 justify-center md:justify-start">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          <Save className="h-4 w-4 relative z-10" />
                          <span className="relative z-10">{saving ? "保存中..." : "保存"}</span>
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="rounded-xl border bg-muted/50 px-5 py-2.5 text-sm font-medium hover:bg-muted transition-all"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <h1 className="text-3xl font-black">{displayName}</h1>
                        {isAdmin && (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="group p-2 rounded-xl hover:bg-muted transition-all hover:-translate-y-0.5"
                            title="编辑个人资料"
                          >
                            <Camera className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {bio}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          佛山
                        </span>
                      </div>
                      <p className="text-muted-foreground max-w-lg leading-relaxed mb-5">{description}</p>

                      {/* Links */}
                      <div className="flex gap-3 justify-center md:justify-start">
                        {links.map((link) => {
                          const Icon = link.icon;
                          return (
                            <a
                              key={link.name}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-transparent overflow-hidden"
                            >
                              <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${link.gradient} shadow-md transition-transform duration-300 group-hover:scale-110 relative`}>
                                <Icon className="h-3.5 w-3.5 text-white" />
                              </div>
                              <span className="relative z-10">{link.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tech stack */}
          <div className="mb-10 animate-fade-in-up delay-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-lg">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-black">技术栈</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 stagger-container">
              {techStack.map((tech, i) => {
                const Icon = tech.icon;
                return (
                  <div
                    key={tech.category}
                    className="group relative overflow-hidden rounded-2xl glass-card p-6 shadow-sm transition-all duration-400 hover:-translate-y-2 hover:shadow-xl hover:shadow-rose-500/10 border border-transparent hover:border-rose-500/20"
                    style={{ animationDelay: `${0.1 * i}s` }}
                  >
                    {/* Gradient on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tech.gradient} opacity-0 transition-opacity duration-400 group-hover:opacity-5`} />
                    {/* Top line */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tech.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />

                    <div className="relative flex items-center gap-3 mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tech.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-base">{tech.category}</h3>
                    </div>
                    <div className="relative flex flex-wrap gap-2">
                      {tech.items.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-muted/80 px-3 py-1 text-sm font-medium transition-all duration-200 tag-pill"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center py-8 animate-fade-in-up delay-200">
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              用 <Heart className="h-4 w-4 text-red-500 animate-pulse" /> 和代码构建
            </p>
          </div>
          </>
          ) : (
          /* Timeline tab */
          <div className="animate-fade-in">
            <div className="mb-16 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-2xl font-black">成长轨迹</h2>
              </div>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-rose-500 via-pink-500 to-orange-400" />
                <div className="space-y-6">
                  {[
                    { year: "2026", gradient: "from-rose-500 to-orange-400", icon: Code, events: [
                      { date: "4月", title: "个人博客上线", desc: "使用 Next.js + Spring Boot 搭建全栈博客系统", tags: ["Next.js", "Spring Boot"] },
                      { date: "3月", title: "DevSecOps 实践", desc: "学习 CI/CD 流水线与安全集成", tags: ["DevOps", "安全"] },
                    ]},
                    { year: "2025", gradient: "from-emerald-500 to-teal-500", icon: GraduationCap, events: [
                      { date: "9月", title: "进入佛山大学", desc: "计算机科学与技术专业", tags: ["大学"] },
                      { date: "7月", title: "第一个全栈项目", desc: "完成了一个完整的前后端分离项目", tags: ["React", "Java"] },
                    ]},
                    { year: "2024", gradient: "from-orange-500 to-amber-500", icon: Terminal, events: [
                      { date: "12月", title: "学习 Linux", desc: "开始使用 Linux 作为日常开发系统", tags: ["Linux"] },
                    ]},
                  ].map((yearData: any, yi: number) => {
                    const Icon = yearData.icon;
                    const isExpanded = expandedYear === yearData.year;
                    return (
                      <div key={yearData.year} className="relative ml-14 animate-fade-in-up" style={{ animationDelay: `${0.1 * yi}s` }}>
                        <div className={`absolute -left-14 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${yearData.gradient} shadow-lg ring-4 ring-background transition-transform duration-300 ${isExpanded ? "scale-110" : ""}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="rounded-2xl glass-card overflow-hidden shadow-sm transition-all duration-400 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-rose-500/20">
                          <button onClick={() => toggleYear(yearData.year)} className="accordion-header w-full flex items-center justify-between p-5">
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent">{yearData.year}</span>
                              <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">{yearData.events.length} 个事件</span>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          <div className={`overflow-hidden transition-all duration-400 ease-out ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                            <div className="border-t border-border/30 px-5 py-5 space-y-5">
                              {yearData.events.map((event: any, ei: number) => (
                                <div key={ei} className="flex gap-5 animate-fade-in-up" style={{ animationDelay: `${0.1 * ei}s` }}>
                                  <div className="shrink-0 w-14 text-sm font-semibold text-muted-foreground pt-1 text-right">{event.date}</div>
                                  <div className="relative flex-1">
                                    <div className="absolute left-0 top-3 w-2 h-2 rounded-full bg-gradient-to-br from-rose-500 to-orange-400" />
                                    <div className="pl-5 pb-5 border-b border-border/10 last:border-0">
                                      <h4 className="font-bold text-base mb-1">{event.title}</h4>
                                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{event.desc}</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {event.tags.map((tag: string) => (
                                          <span key={tag} className="rounded-full bg-gradient-to-r from-rose-500/10 to-orange-400/10 px-2.5 py-0.5 text-xs font-medium text-rose-500 border border-rose-500/10">{tag}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AboutLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<AboutLoading />}>
      <AboutContent />
    </Suspense>
  );
}