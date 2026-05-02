"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Code, Loader2, ExternalLink, Github, Star, ArrowRight, Folder, Zap, Cpu, Globe } from "lucide-react";
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-orange-400/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-pink-500/8 to-rose-500/5 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-14">
          {/* Header */}
          <div className="mb-14 text-center animate-fade-in-up">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-rose-500/30">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-black">项目作品</h1>
            <p className="text-muted-foreground">
              共 <span className="font-bold text-foreground">{projects.length}</span> 个作品，记录成长与实践
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl glass-card animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project, i) => {
                const gradient = gradients[i % gradients.length];
                const isFeatured = project.featured;
                return (
                  <div
                    key={project.id}
                    className={`group relative flex flex-col rounded-2xl glass-card overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20 border border-transparent animate-fade-in-up`}
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
                      <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-orange-400/10">
                        {/* Decorative shapes */}
                        <div className={`absolute top-4 right-4 w-16 h-16 border border-rose-500/10 rotate-12 rounded-sm opacity-50 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-500`} />
                        <div className={`absolute bottom-4 left-4 w-10 h-10 border border-pink-500/10 -rotate-6 rounded-sm opacity-50 group-hover:opacity-100 group-hover:-rotate-12 transition-all duration-700`} />
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                          <Cpu className="h-7 w-7 text-white" />
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
                    <div className="flex-1 p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-base group-hover:text-primary transition-colors leading-tight ${isFeatured ? "text-lg" : ""}`}>
                          {project.name}
                        </h3>
                        {isFeatured && !project.coverImage && (
                          <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                      {project.techStack && (
                        <div className="flex flex-wrap gap-1.5">
                          {project.techStack.split(",").map((tech: string, j: number) => (
                            <span
                              key={j}
                              className={`rounded-full bg-gradient-to-r ${gradients[j % gradients.length]}/10 px-2.5 py-0.5 text-xs font-medium transition-all duration-200 tag-pill`}
                            >
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 border-t border-border/30 p-3">
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/btn flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/50 py-2.5 text-sm font-medium transition-all hover:bg-muted hover:-translate-y-0.5"
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
                          className={`group/btn flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${gradient} py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5`}
                        >
                          <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                          演示
                        </a>
                      )}
                      {!project.url && !project.demoUrl && (
                        <Link
                          href="/projects"
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/50 py-2.5 text-sm font-medium text-muted-foreground"
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
