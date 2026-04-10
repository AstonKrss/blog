"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Tag as TagIcon, Sparkles } from "lucide-react";
import Link from "next/link";

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/public/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags || []));
  }, []);

  const gradients = [
    "from-indigo-500 to-blue-500",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-cyan-500 to-blue-500",
    "from-rose-500 to-pink-500",
    "from-violet-500 to-purple-500",
    "from-teal-500 to-green-500",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-teal-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <TagIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">标签</h1>
              <p className="text-sm text-muted-foreground">浏览所有技术标签</p>
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
              <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/5 blur-2xl" />
              <div className="relative flex flex-wrap gap-3">
                {tags.map((tag: any, index: number) => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${tag.slug}`}
                    className={`group flex items-center gap-2 rounded-full bg-gradient-to-r ${gradients[index % gradients.length]} px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:scale-105 hover:shadow-lg`}
                  >
                    {tag.name}
                    <span className="text-xs text-white/70">{tag.postCount || 0}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border bg-card py-20 text-center shadow-sm glow-card">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />
              </div>
              <div className="relative">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <TagIcon className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">暂无标签</h3>
                <p className="text-muted-foreground">标签将会在这里显示</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
