"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Search, FileText, Loader2, Sparkles, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const QUICK_KEYWORDS = ["Spring Boot", "Next.js", "安全", "Docker", "Java", "DevOps"];

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
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:py-14">
          {/* Header */}
          <div className="mb-6 animate-fade-in-up sm:mb-10">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-rose-500/25 sm:h-16 sm:w-16">
              <Search className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">搜索文章</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              输入标题、标签或内容关键词，快速找到博客里的技术笔记、项目记录和安全实践。
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mb-8 rounded-2xl glass-card p-3 animate-fade-in-up delay-100 sm:mb-10 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入关键词搜索..."
                  className="h-13 w-full rounded-xl border border-border/50 bg-background/70 pl-12 pr-4 text-base shadow-sm outline-none transition-all focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 sm:h-14"
                />
              </label>
              <button
                type="submit"
                className="flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:h-14"
              >
                <Sparkles className="h-4 w-4" />
                搜索
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {QUICK_KEYWORDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    window.location.href = `/search?q=${encodeURIComponent(item)}`;
                  }}
                  className="shrink-0 rounded-full border border-border/50 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-rose-500/30 hover:text-rose-500"
                >
                  {item}
                </button>
              ))}
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
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">搜索结果</p>
                  <h2 className="text-2xl font-black">
                    {total} 个结果
                    <span className="ml-2 text-base font-medium text-muted-foreground">"{q}"</span>
                  </h2>
                </div>
                <Link href="/blog" className="text-sm font-semibold text-rose-500 hover:text-rose-400">
                  浏览全部文章
                </Link>
              </div>
              {results.length > 0 ? (
                <div className="grid gap-3 stagger-container sm:grid-cols-2">
                  {results.map((post, i) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex min-h-36 items-start gap-4 rounded-2xl glass-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5"
                      style={{ animationDelay: `${0.05 * i}s` }}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-400/15 text-rose-500 transition-transform duration-300 group-hover:scale-110">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="line-clamp-2 font-bold text-base transition-colors group-hover:text-rose-500">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-rose-500/80">
                          <span>查看全文</span>
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
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
            <div className="rounded-2xl glass-card p-5 animate-fade-in sm:p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: "搜技术栈", desc: "Java、Spring Boot、Next.js" },
                  { title: "搜安全实践", desc: "XSS、SQLi、DevSecOps" },
                  { title: "搜项目记录", desc: "部署、性能、工程化" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl bg-muted/40 p-4">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
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
