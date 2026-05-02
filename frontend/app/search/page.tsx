"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Search, FileText, Loader2, Sparkles, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(q);

  useEffect(() => {
    if (q) {
      setLoading(true);
      fetch(`${API_BASE}/api/public/search?q=${encodeURIComponent(q)}&page=1&limit=20`)
        .then(r => r.json())
        .then(data => {
          if (data.code === 0) {
            setResults(data.data?.posts || []);
            setTotal(data.data?.total || 0);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-pink-500/8 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-14">
          {/* Header */}
          <div className="mb-10 flex items-center gap-4 animate-fade-in-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-pink-500 shadow-xl shadow-pink-500/20">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">搜索</h1>
              <p className="text-sm text-muted-foreground mt-0.5">搜索文章标题和内容</p>
            </div>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mb-10 animate-fade-in-up delay-100">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-pink-500 transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入关键词搜索..."
                className="w-full rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm pl-14 pr-36 py-4.5 text-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                搜索
              </button>
            </div>
          </form>

          {/* Results */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl glass-card animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-pink-500 mb-4" />
              <p className="text-muted-foreground">搜索中...</p>
            </div>
          ) : q ? (
            <div className="space-y-5 animate-fade-in-up delay-100">
              <p className="text-sm text-muted-foreground">
                找到 <span className="font-bold text-foreground">{total}</span> 个结果
                <span className="ml-2 text-muted-foreground/60">" {q} "</span>
              </p>
              {results.length > 0 ? (
                <div className="space-y-3 stagger-container">
                  {results.map((post, i) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex items-start gap-4 rounded-2xl glass-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                      style={{ animationDelay: `${0.05 * i}s` }}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/20 text-pink-500 transition-transform duration-300 group-hover:scale-110">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base group-hover:text-pink-500 transition-colors mb-1">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3 text-pink-500/0 group-hover:text-pink-500/60 transition-all" />
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">点击查看全文</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl glass-card py-20 text-center shadow-sm animate-fade-in">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-pink-400/10 blur-2xl" />
                  </div>
                  <div className="relative">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/20">
                      <Search className="h-8 w-8 text-pink-500" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold">没有找到相关内容</h3>
                    <p className="text-muted-foreground mb-5">试试其他关键词，或者浏览全部文章</p>
                    <Link
                      href="/blog"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                    >
                      浏览博客
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl glass-card text-center animate-fade-in">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/20">
                <Search className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">输入关键词开始搜索</h3>
              <p className="text-muted-foreground">支持搜索文章标题和内容</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}