"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Calendar, FileText, ChevronDown, ChevronRight, Eye, ArrowUp, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ArchivePage() {
  return <ArchiveContent />;
}

function ArchiveContent() {
  const [archive, setArchive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postContent, setPostContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    fetch(`${API_BASE}/api/public/archive`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0 && data.data?.length > 0) {
          setArchive(data.data || []);
          // Auto select first post
          const firstYear = data.data[0];
          if (firstYear.months?.length > 0) {
            const firstMonth = firstYear.months[0];
            if (firstMonth.posts?.length > 0) {
              loadPostContent(firstMonth.posts[0]);
            }
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleYear = (year: string) => {
    setCollapsedYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
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
        setActiveSection(post.slug);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContent(false);
    }
  };

  // Total post count
  const totalPosts = archive.reduce(
    (acc, y) => acc + y.months.reduce((a: number, m: any) => a + m.count, 0), 0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
            <p className="text-muted-foreground">加载归档中...</p>
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
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-emerald-500/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-rose-500/8 to-orange-400/5 blur-[80px]" />
        </div>

        <div className="relative w-full px-4 py-14">
          {/* Page Header */}
          <div className="mb-10 flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 shadow-xl shadow-teal-500/20">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black">归档</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  共 <span className="font-bold text-foreground">{totalPosts}</span> 篇文章，按时间整理
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Table of Contents */}
            <aside className="w-full lg:w-72 shrink-0 animate-fade-in-left">
              <div className="rounded-2xl glass-card p-5 sticky top-24 max-h-[calc(100vh-180px)] overflow-y-auto space-y-4">
                {/* TOC Header */}
                <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                  <BookOpen className="h-4 w-4 text-cyan-500" />
                  <span className="font-semibold text-sm">目录</span>
                  <span className="ml-auto text-xs text-muted-foreground">{archive.length} 年</span>
                </div>

                {/* Year/Month/Post tree */}
                <nav className="space-y-1">
                  {archive.map((yearData: any) => {
                    const yearKey = yearData.year.toString();
                    const isYearCollapsed = collapsedYears.has(yearKey);
                    const yearCount = yearData.months.reduce((a: number, m: any) => a + m.count, 0);

                    return (
                      <div key={yearData.year} className="animate-fade-in-up">
                        {/* Year button */}
                        <button
                          onClick={() => toggleYear(yearKey)}
                          className="accordion-header w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group"
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-cyan-500 transition-transform duration-300 ${isYearCollapsed ? "-rotate-90" : ""}`}
                          />
                          <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
                            {yearData.year}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground font-normal">
                            {yearCount}
                          </span>
                        </button>

                        {/* Months (animated expand) */}
                        <div
                          className={`overflow-hidden transition-all duration-400 ease-out ${
                            isYearCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
                          }`}
                        >
                          <div className="ml-4 mt-1 space-y-0.5">
                            {yearData.months.map((month: any) => {
                              const monthKey = `${yearKey}-${month.month}`;
                              const isMonthCollapsed = collapsedMonths.has(monthKey);

                              return (
                                <div key={month.month}>
                                  {/* Month button */}
                                  <button
                                    onClick={() => toggleMonth(monthKey)}
                                    className="accordion-header w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150"
                                  >
                                    <ChevronDown
                                      className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${isMonthCollapsed ? "-rotate-90" : ""}`}
                                    />
                                    <span className="text-muted-foreground font-medium">{month.month}月</span>
                                    <span className="text-muted-foreground/50 text-[10px]">({month.count})</span>
                                  </button>

                                  {/* Posts */}
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ease-out ${
                                      isMonthCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
                                    }`}
                                  >
                                    <div className="ml-5 mt-0.5 space-y-0.5 pb-1">
                                      {month.posts.map((post: any) => {
                                        const isActive = selectedPostSlug === post.slug;
                                        return (
                                          <button
                                            key={post.id}
                                            onClick={() => loadPostContent(post)}
                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-200 truncate ${
                                              isActive
                                                ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-600 dark:text-cyan-400 font-semibold shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            }`}
                                          >
                                            <span className={`block truncate ${isActive ? "text-cyan-600 dark:text-cyan-400" : ""}`}>
                                              {post.title}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Right: Post Content */}
            <div className="flex-1 min-w-0">
              {loadingContent ? (
                <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-4" />
                  <p className="text-muted-foreground">加载文章...</p>
                </div>
              ) : selectedPost ? (
                <div className="animate-fade-in-up rounded-2xl glass-card overflow-hidden shadow-lg">
                  {/* Article header */}
                  <div className="relative px-8 pt-8 pb-6 border-b border-border/30 bg-gradient-to-r from-cyan-500/5 via-teal-500/5 to-transparent">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-3 py-1 text-xs font-medium">
                          <BookOpen className="h-3 w-3" />
                          归档文章
                        </span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-black mb-5 leading-tight">{selectedPost.title}</h1>
                      <div className="flex items-center gap-5 text-sm text-muted-foreground">
                        {selectedPost.publishedAt && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-cyan-500" />
                            {new Date(selectedPost.publishedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
                          </span>
                        )}
                        {selectedPost.viewCount !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <Eye className="h-4 w-4 text-emerald-500" />
                            {selectedPost.viewCount} 阅读
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Article body */}
                  <div className="p-8 md:p-10">
                    <div className="prose prose-lg dark:prose-invert max-w-none animate-fade-in-up delay-100">
                      <MarkdownRenderer content={postContent} />
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t border-border/30 flex items-center justify-between animate-fade-in-up delay-200">
                      <Link
                        href={`/blog/${selectedPost.slug}`}
                        className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5"
                      >
                        <FileText className="h-4 w-4" />
                        在新页面查看
                      </Link>
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowUp className="h-4 w-4" />
                        返回顶部
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl glass-card py-24 text-center animate-fade-in">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20">
                    <Calendar className="h-8 w-8 text-cyan-500" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">暂无归档</h3>
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