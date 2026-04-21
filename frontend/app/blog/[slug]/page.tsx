import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CommentSection } from "@/components/comment-section";
import { ReadingProgress } from "@/components/reading-progress";
import { LikeButton } from "@/components/like-button";
import { SEO } from "@/components/seo";
import { Calendar, Eye, ArrowLeft, Tag, Clock, List, ChevronUp, ChevronDown, Share2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface TocItem {
  id: string;
  text: string;
  level: number;
  children?: TocItem[];
}

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
          <Link href="/blog" className="text-indigo-500 hover:underline">返回博客列表</Link>
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
          {/* Hero Section */}
          <div className="relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/20 to-transparent rounded-full blur-3xl opacity-50" />
            
            <div className="relative container mx-auto px-4 pt-12 pb-8">
              {/* Back button */}
              <Link 
                href="/blog" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-all hover:-translate-x-1 blog-animate-slide-in-left"
              >
                <ArrowLeft className="h-4 w-4" />
                返回博客列表
              </Link>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 blog-animate-fade-in-up">
                {post.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 blog-animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) : "未发布"}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50">
                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  {post.viewCount || 0} 阅读
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {readingTime} 分钟阅读
                </span>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-4 blog-animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {tags.map((tag: string, i: number) => (
                    <Link
                      key={i}
                      href={`/blog?tag=${tag.toLowerCase().replace(/\s+/g, "-")}`}
                      className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-sm text-foreground hover:from-indigo-500/20 hover:to-purple-500/20 transition-all"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* TOC for desktop */}
              {toc.length > 0 && (
                <div className="hidden lg:block mt-6 blog-animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <List className="h-4 w-4" />
                    <span>目录</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {toc.slice(0, 8).map((item: TocItem, i: number) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="px-3 py-1 text-xs rounded-full bg-card border hover:border-indigo-500/50 hover:text-indigo-500 transition-all"
                      >
                        {item.text.length > 20 ? item.text.slice(0, 20) + "..." : item.text}
                      </a>
                    ))}
                    {toc.length > 8 && (
                      <span className="px-3 py-1 text-xs text-muted-foreground">
                        +{toc.length - 8} 更多
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Article Content - iOS Style Full Width */}
          <article className="relative">
            {/* Floating TOC for mobile */}
            {toc.length > 0 && (
              <div className="lg:hidden container mx-auto px-4 mb-4">
                <details className="rounded-2xl border bg-card/80 backdrop-blur-sm overflow-hidden blog-animate-fade-in">
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span className="font-medium">目录</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform details-chevron" />
                  </summary>
                  <div className="px-4 pb-4 space-y-1">
                    {toc.map((item: TocItem) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`block py-1.5 text-sm text-muted-foreground hover:text-indigo-500 transition-colors ${item.level > 1 ? 'pl-4' : ''}`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Main content */}
            <div className="container mx-auto px-4 py-8">
              <div className="rounded-3xl bg-card/60 backdrop-blur-sm border shadow-lg overflow-hidden blog-animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                {/* Article header bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {authorName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{authorName}</div>
                      <div className="text-xs text-muted-foreground">作者</div>
                    </div>
                  </div>
                  <button className="p-2 rounded-full hover:bg-secondary transition-colors" title="分享">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Markdown content */}
                <div className="p-6 md:p-10 lg:p-12">
                  <MarkdownRenderer content={post.content} />
                </div>

                {/* Article footer - Like and Comment */}
                <div className="px-6 py-6 border-t bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                  <div className="flex items-center justify-between">
                    <LikeButton postId={post.id} />
                    <a 
                      href="#comments" 
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-indigo-500 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>评论</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Comments Section */}
          <div id="comments" className="container mx-auto px-4 pb-16">
            <div className="rounded-3xl border bg-card/60 backdrop-blur-sm shadow-lg p-6 md:p-8 blog-animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xl font-bold">评论</h2>
              </div>
              <CommentSection postId={post.id} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
