"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Code, Loader2, ExternalLink, Github, Star, ArrowRight } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/projects?page=1&limit=20`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setProjects(data.data?.projects || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <Code className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">项目</h1>
              <p className="text-sm text-muted-foreground">作品集与开源项目</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group flex flex-col rounded-2xl border bg-card/80 shadow-sm hover:shadow-lg transition-all"
                >
                  {project.coverImage ? (
                    <div className="relative h-40 overflow-hidden rounded-t-2xl">
                      <img
                        src={project.coverImage}
                        alt={project.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-t-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                      <Code className="h-12 w-12 text-emerald-500" />
                    </div>
                  )}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold group-hover:text-emerald-500 transition-colors">
                        {project.name}
                      </h3>
                      {project.featured && (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    {project.description && (
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                        {project.description}
                      </p>
                    )}
                    {project.techStack && (
                      <div className="flex flex-wrap gap-1.5">
                        {project.techStack.split(",").map((tech: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 border-t p-3">
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-muted py-2 text-sm hover:bg-emerald-500/10 hover:text-emerald-500"
                      >
                        <Github className="h-4 w-4" />
                        代码
                      </a>
                    )}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-sm text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        演示
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card py-12 text-center">
              <Code className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">暂无项目</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}