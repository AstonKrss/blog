"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Tag as TagIcon, Loader2, ArrowRight, Sparkles, Hash } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/tags`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) setTags(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const gradients = [
    "from-rose-500 to-pink-500",
    "from-orange-500 to-amber-500",
    "from-emerald-500 to-teal-500",
    "from-pink-500 to-rose-500",
    "from-cyan-500 to-blue-500",
    "from-violet-500 to-purple-500",
    "from-rose-500 to-orange-400",
    "from-teal-500 to-green-500",
    "from-fuchsia-500 to-pink-500",
    "from-amber-500 to-yellow-500",
  ];

  const totalPosts = tags.reduce((acc, t) => acc + (t.postCount || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-orange-400/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-pink-500/8 to-rose-500/5 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-14">
          {/* Header */}
          <div className="mb-12 text-center animate-fade-in-up">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-rose-500/30">
              <Hash className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-black">标签</h1>
            <p className="text-muted-foreground">
              共 <span className="font-bold text-foreground">{tags.length}</span> 个标签，
              <span className="font-bold text-foreground">{totalPosts}</span> 篇文章
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl glass-card animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : tags.length > 0 ? (
            <div className="animate-fade-in-up delay-100">
              {/* Bento-style tag cloud */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {tags.map((tag: any, index: number) => {
                  const gradient = gradients[index % gradients.length];
                  const isSelected = selectedTag === tag.slug;
                  const postCount = tag.postCount || 0;
                  // Size based on post count
                  const sizeClass = postCount > 5 ? "col-span-1 row-span-1" : "";

                  return (
                    <div
                      key={tag.id}
                      className={`relative group ${sizeClass}`}
                    >
                      <Link
                        href={`/blog?tag=${tag.slug}`}
                        onMouseEnter={() => setSelectedTag(tag.slug)}
                        onMouseLeave={() => setSelectedTag(null)}
                        className={`relative flex flex-col items-center justify-center rounded-2xl p-5 text-center transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl hover:border-rose-500/20 glass-card border border-border/50 overflow-hidden ${
                          isSelected ? "border-transparent" : ""
                        }`}
                      >
                        {/* Gradient bg on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-400`} />
                        {/* Top line accent */}
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

                        <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-3 transition-transform duration-300 group-hover:scale-110`}>
                          <TagIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className={`relative text-sm font-bold mb-1 transition-colors ${isSelected ? "text-white" : "text-foreground"}`}>
                          {tag.name}
                        </div>
                        <div className={`relative text-xs transition-colors ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                          {postCount} 篇
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Browse all link */}
              <div className="mt-10 text-center">
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 px-8 py-4 font-bold text-white shadow-xl shadow-rose-500/25 transition-all hover:shadow-2xl hover:shadow-rose-500/30 hover:-translate-y-1"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>浏览全部文章</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl glass-card py-24 text-center shadow-lg animate-fade-in">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-rose-500/10 blur-2xl" />
              </div>
              <div className="relative">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
                  <TagIcon className="h-8 w-8 text-rose-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">暂无标签</h3>
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
