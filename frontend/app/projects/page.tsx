"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2, ExternalLink, Github, Star, ArrowRight, Folder, Zap, Cpu, Globe, Layers3 } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/projects?page=1&limit=20`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) setProjects(data.data?.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const gradients = [
    "from-rose-500 to-pink-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-cyan-500 to-blue-500",
    "from-violet-500 to-purple-500",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-14">
          {/* Header */}
          <div className="mb-8 overflow-hidden rounded-2xl glass-card p-5 animate-fade-in-up sm:mb-10 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-rose-500/25 sm:h-16 sm:w-16">
                  <Zap className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">项目作品</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  把练手、实战、部署和安全实验都收在这里。每个项目都是一次从想法到上线的完整记录。
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-80">
                {[
                  { label: "作品", value: projects.length },
                  { label: "精选", value: projects.filter(p => p.featured).length },
                  { label: "在线", value: projects.filter(p => p.demoUrl).length },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-muted/45 p-3 text-center">
                    <div className="text-2xl font-black">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl glass-card animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => {
                const gradient = gradients[i % gradients.length];
                const isFeatured = project.featured;
                return (
                  <div
                    key={project.id}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl glass-card transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl md:hover:-translate-y-2 ${isFeatured ? "md:col-span-2 lg:col-span-1" : ""} animate-fade-in-up`}
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    {/* Gradient top accent */}
                    <div className={`h-1 bg-gradient-to-r ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

                    {/* Cover */}
                    {project.coverImage ? (
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={project.coverImage}
                          alt={project.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        {isFeatured && (
                          <div className="absolute top-3 right-3">
                            <span className="flex items-center gap-1 rounded-full bg-yellow-500/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                              <Star className="h-3 w-3 fill-white" />
                              精选
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-background/70 via-muted/50 to-card">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                          {isFeatured ? <Layers3 className="h-7 w-7 text-white" /> : <Cpu className="h-7 w-7 text-white" />}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        {isFeatured && (
                          <div className="absolute top-3 right-3">
                            <span className="flex items-center gap-1 rounded-full bg-yellow-500/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                              <Star className="h-3 w-3 fill-white" />
                              精选
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-4 space-y-3 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-base group-hover:text-primary transition-colors leading-tight ${isFeatured ? "text-lg" : ""}`}>
                          {project.name}
                        </h3>
                        {isFeatured && !project.coverImage && (
                          <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed sm:min-h-[4.75rem]">
                          {project.description}
                        </p>
                      )}
                      {project.techStack && (
                        <div className="flex flex-wrap gap-1.5">
                          {project.techStack.split(",").map((tech: string, j: number) => (
                            <span
                              key={j}
                              className="rounded-full border border-border/40 bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:border-rose-500/30 hover:text-rose-500"
                            >
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 border-t border-border/30 p-3">
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/btn flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/50 px-3 text-sm font-semibold transition-all hover:bg-muted hover:-translate-y-0.5"
                        >
                          <Github className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                          代码
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group/btn flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${gradient} px-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5`}
                        >
                          <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                          演示
                        </a>
                      )}
                      {!project.url && !project.demoUrl && (
                        <Link
                          href="/projects"
                          className="col-span-2 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/50 text-sm font-medium text-muted-foreground"
                        >
                          <Folder className="h-4 w-4" />
                          暂无
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl glass-card py-24 text-center shadow-lg animate-fade-in">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-rose-500/10 blur-2xl" />
              </div>
              <div className="relative">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
                  <Folder className="h-8 w-8 text-rose-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">暂无项目</h3>
                <p className="text-muted-foreground">项目将会在这里显示</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
