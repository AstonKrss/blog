import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CommentSection } from "@/components/comment-section";
import { ReadingProgress } from "@/components/reading-progress";
import { Calendar, Eye, ArrowLeft, Tag, Clock } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/public/posts/${slug}`, { next: { revalidate: 60 } });
    const data = await res.json();
    return data.code === 0 ? data.data : null;
  } catch { return null; }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">文章未找到</h1>
          <Link href="/blog" className="text-indigo-500 hover:underline">返回博客列表</Link>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ReadingProgress />
      <main className="flex-1">
        {/* Article Header */}
        <div className="relative overflow-hidden border-b bg-card/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-float absolute -top-16 -right-16 h-64 w-64 rounded-full bg-indigo-400/5 blur-2xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 py-12">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-indigo-500 mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              返回博客列表
            </Link>
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) : "未发布"}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {post.viewCount || 0} 阅读
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {Math.max(1, Math.ceil((post.content || "").split(/\s+/).length / 200))} 分钟阅读
              </span>
              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {post.tags.map((pt: any) => (
                    <Link
                      key={pt.tag.slug}
                      href={`/blog?tag=${pt.tag.slug}`}
                      className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-500 hover:bg-indigo-500/20 transition-colors"
                    >
                      {pt.tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-8 md:p-12 shadow-sm glow-card">
            <MarkdownRenderer content={post.content} />
          </div>
        </article>

        {/* Comments */}
        <div className="mx-auto max-w-4xl px-4 pb-12">
          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-8 shadow-sm">
            <CommentSection postId={post.id} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
