import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CommentSection } from "@/components/comment-section";
import { ReadingProgress } from "@/components/reading-progress";
import { LikeButton } from "@/components/like-button";
import { SEO } from "@/components/seo";
import { ReadingEgg } from "@/components/games/reading-egg";
import { Calendar, Eye, ArrowLeft, Tag, Clock, List, ChevronDown, Share2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface TocItem { id: string; text: string; level: number; children?: TocItem[]; }

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/public/posts/${slug}`, { next: { revalidate: 60 } });
    const data = await res.json();
    return data.code === 0 ? data.data : null;
  } catch { return null; }
}

async function getToc(slug: string): Promise<TocItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/posts/${slug}/toc`, { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.code === 0 ? data.data : [];
  } catch { return []; }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, toc] = await Promise.all([getPost(slug), getToc(slug)]);

  if (!post) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center animate-fade-in">
          <h1 className="text-2xl font-bold mb-2">文章未找到</h1>
          <Link href="/blog" className="text-primary hover:underline">返回博客列表</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  const tags = post.tags?.map((t: any) => t.tag?.name || t.name || "").filter(Boolean) || [];
  const authorName = post.author?.displayName || post.author?.username || "Aston";
  const readingTime = Math.max(1, Math.ceil((post.content || "").split(/\s+/).length / 200));

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt || `${post.title} - 技术博客文章`}
        type="article"
        publishedTime={post.publishedAt}
        author={authorName}
        tags={tags}
        url={`/blog/${slug}`}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <ReadingProgress />
        <main className="flex-1">

          {/* Hero */}
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="animate-pulse-slow absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-rose-500/10 to-transparent rounded-full blur-3xl" />
              <div className="animate-float -top-32 right-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-rose-500/5 to-orange-400/5 blur-[100px]" />
              <div className="animate-float-delayed -bottom-32 left-1/4 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-cyan-500/5 to-teal-500/5 blur-[80px]" />
            </div>

            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400" />

            <div className="relative container mx-auto px-4 pt-12 pb-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-all hover:-translate-x-1 group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                返回博客列表
              </Link>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 animate-fade-in-up">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm mb-6 animate-fade-in-up delay-100">
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-card shadow-sm">
                  <Calendar className="h-3.5 w-3.5 text-rose-500" />
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) : "未发布"}
                </span>
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-card shadow-sm">
                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  {post.viewCount || 0} 阅读
                </span>
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-card shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {readingTime} 分钟阅读
                </span>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-4 animate-fade-in-up delay-150">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {tags.map((tag: string, i: number) => (
                    <Link
                      key={i}
                      href={`/blog?tag=${tag.toLowerCase().replace(/\s+/g, "-")}`}
                      className="tag-pill rounded-full bg-gradient-to-r from-rose-500/10 to-orange-400/10 px-3 py-1 text-sm font-medium transition-all"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* TOC desktop */}
              {toc.length > 0 && (
                <div className="hidden lg:block mt-6 animate-fade-in-up delay-200">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <List className="h-4 w-4" />
                    <span>目录</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {toc.slice(0, 8).map((item: TocItem, i: number) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="px-3.5 py-1.5 text-xs rounded-full glass-card hover:shadow-md transition-all hover:-translate-y-0.5 tag-pill"
                        style={{ animationDelay: `${0.05 * i}s` }}
                      >
                        {item.text.length > 20 ? item.text.slice(0, 20) + "..." : item.text}
                      </a>
                    ))}
                    {toc.length > 8 && (
                      <span className="px-3 py-1 text-xs text-muted-foreground">+{toc.length - 8} 更多</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Article */}
          <article className="relative">
            {/* TOC mobile */}
            {toc.length > 0 && (
              <div className="lg:hidden container mx-auto px-4 mb-6 animate-fade-in">
                <details className="rounded-2xl glass-card overflow-hidden">
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4 text-rose-500" />
                      <span className="font-medium">目录</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 details-chevron" />
                  </summary>
                  <div className="px-4 pb-4 space-y-1">
                    {toc.map((item: TocItem) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`block py-1.5 text-sm text-muted-foreground hover:text-rose-500 transition-colors ${item.level > 1 ? 'pl-4' : ''}`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </div>
                </details>
              </div>
            )}

            <div className="container mx-auto px-4 py-8">
              <div className="rounded-3xl glass-card overflow-hidden shadow-xl animate-fade-in-up delay-100">
                {/* Author bar */}
                <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border/30 bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-pink-5/5">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 flex items-center justify-center text-white font-bold shadow-md transition-transform duration-300 hover:scale-110">
                      {authorName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{authorName}</div>
                      <div className="text-xs text-muted-foreground">作者</div>
                    </div>
                  </div>
                  <button className="p-2.5 rounded-xl glass-card hover:bg-muted transition-colors" title="分享">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-10 lg:p-12">
                  <MarkdownRenderer content={post.content} />
                </div>

                {/* Footer */}
                <div className="px-6 md:px-8 py-6 border-t border-border/30 bg-gradient-to-r from-rose-500/5 to-purple-5/5">
                  <div className="flex items-center justify-between">
                    <LikeButton postId={post.id} />
                    <a
                      href="#comments"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>评论</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Comments */}
          <div className="container mx-auto px-4 pb-16">
            <div className="rounded-3xl glass-card p-6 md:p-8 shadow-xl animate-fade-in-up delay-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 shadow-md">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-black">评论</h2>
              </div>
              <CommentSection postId={post.id} />
            </div>
          </div>
        </main>
        <Footer />
        <ReadingEgg postId={post.id} />
      </div>
    </>
  );
}