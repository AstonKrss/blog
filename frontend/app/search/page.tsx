"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Search, FileText, Loader2 } from "lucide-react";

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
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-purple-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">搜索</h1>
              <p className="text-sm text-muted-foreground">搜索文章标题和内容</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入关键词搜索..."
                className="w-full rounded-xl border bg-card/80 px-12 py-4 text-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white"
              >
                搜索
              </button>
            </div>
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : q ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                找到 {total} 个结果
              </p>
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex items-start gap-4 rounded-xl border bg-card/80 p-4 shadow-sm hover:bg-muted/50"
                    >
                      <FileText className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold group-hover:text-purple-500">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-card py-12 text-center">
                  <p className="text-muted-foreground">没有找到相关内容</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border bg-card py-12 text-center">
              <p className="text-muted-foreground">输入关键词开始搜索</p>
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
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}