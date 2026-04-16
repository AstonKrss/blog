"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Calendar, FileText, ChevronDown, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ArchivePage() {
  return <ArchiveContent />;
}

function ArchiveContent() {
  const [archive, setArchive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 折叠状态
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  
  // 当前查看的文章
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postContent, setPostContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/archive`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0 && data.data?.length > 0) {
          const firstYear = data.data[0];
          if (firstYear.months?.length > 0) {
            const firstMonth = firstYear.months[0];
            if (firstMonth.posts?.length > 0) {
              loadPostContent(firstMonth.posts[0]);
            }
          }
          setArchive(data.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleYear = (year: string) => {
    const newSet = new Set(collapsedYears);
    if (newSet.has(year)) newSet.delete(year);
    else newSet.add(year);
    setCollapsedYears(newSet);
  };

  const toggleMonth = (key: string) => {
    const newSet = new Set(collapsedMonths);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setCollapsedMonths(newSet);
  };

  const loadPostContent = async (post: any) => {
    setSelectedPostSlug(post.slug);
    setLoadingContent(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/posts/${post.slug}`);
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setSelectedPost(data.data);
        setPostContent(data.data.content || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-cyan-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-teal-400/5 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">归档</h1>
              <p className="text-sm text-muted-foreground">按时间浏览所有文章</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* 左侧目录 */}
            <aside className="w-full lg:w-64 shrink-0">
              <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-5 sticky top-24 shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">目录</h3>
                
                <nav className="space-y-2">
                  {archive.map((yearData: any) => {
                    const yearKey = yearData.year.toString();
                    const isYearCollapsed = collapsedYears.has(yearKey);
                    
                    return (
                      <div key={yearData.year}>
                        <button
                          onClick={() => toggleYear(yearKey)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-bold hover:bg-muted transition-colors text-left"
                        >
                          {isYearCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-indigo-500" />
                          )}
                          <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                            {yearData.year}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({yearData.months.reduce((acc: number, m: any) => acc + m.count, 0)})
                          </span>
                        </button>
                        
                        {!isYearCollapsed && (
                          <div className="ml-4 mt-1 space-y-1">
                            {yearData.months.map((month: any) => {
                              const monthKey = `${yearKey}-${month.month}`;
                              const isMonthCollapsed = collapsedMonths.has(monthKey);
                              
                              return (
                                <div key={month.month}>
                                  <button
                                    onClick={() => toggleMonth(monthKey)}
                                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left"
                                  >
                                    {isMonthCollapsed ? (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="text-muted-foreground">{month.month}月</span>
                                    <span className="text-muted-foreground/50">({month.count})</span>
                                  </button>
                                  
                                  {!isMonthCollapsed && (
                                    <div className="ml-5 mt-0.5 space-y-0.5">
                                      {month.posts.map((post: any) => (
                                        <button
                                          key={post.id}
                                          onClick={() => loadPostContent(post)}
                                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                                            selectedPostSlug === post.slug
                                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium"
                                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                          }`}
                                        >
                                          {post.title}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* 右侧文章内容 */}
            <div className="flex-1 min-w-0">
              {loadingContent ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-pulse text-muted-foreground">加载中...</div>
                </div>
              ) : selectedPost ? (
                <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm">
                  <div className="mb-6 pb-4 border-b">
                    <h1 className="text-3xl font-bold mb-4">{selectedPost.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {selectedPost.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(selectedPost.publishedAt).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                      {selectedPost.viewCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {selectedPost.viewCount} 阅读
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <MarkdownRenderer content={postContent} />
                  </div>
                  <div className="mt-8 pt-4 border-t">
                    <Link
                      href={`/blog/${selectedPost.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm hover:shadow-lg transition-all"
                    >
                      在新页面查看
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card py-20 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Calendar className="h-8 w-8 text-cyan-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">暂无归档</h3>
                  <p className="text-muted-foreground">文章归档将会在这里显示</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}