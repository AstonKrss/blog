import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { BookOpen, Calendar, Search, Sparkles } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getPosts(page = 1, tag = "") {
  try {
    let url = `${API_BASE}/api/public/posts?page=${page}&limit=12`;
    if (tag) url += `&tag=${tag}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();
    if (data.code === 0 && data.data) {
      return { posts: data.data.posts || [], pagination: data.data.pagination || {} };
    }
    return { posts: [], pagination: {} };
  } catch { return { posts: [], pagination: {} }; }
}

async function getTags() {
  try {
    const res = await fetch(`${API_BASE}/api/public/tags`, { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.code === 0 ? data.data?.tags || [] : [];
  } catch { return []; }
}

const tagColors = [
  "from-indigo-500 to-blue-500",
  "from-purple-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-cyan-500 to-blue-500",
  "from-rose-500 to-pink-500",
  "from-violet-500 to-purple-500",
  "from-teal-500 to-green-500",
];

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; tag?: string }> }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const tag = params.tag || "";
  const { posts, pagination } = await getPosts(page, tag);
  const tags = await getTags();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-indigo-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-purple-400/5 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold">博客</h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">分享技术实践与思考</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="w-full lg:w-72 shrink-0">
              <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 sticky top-24 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">标签筛选</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/blog"
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      !tag
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    全部
                  </Link>
                  {tags.map((t: any, i: number) => (
                    <Link
                      key={t.slug}
                      href={`/blog?tag=${t.slug}`}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        tag === t.slug
                          ? `bg-gradient-to-r ${tagColors[i % tagColors.length]} text-white shadow-md`
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            {/* Posts */}
            <div className="flex-1">
              {tag && (
                <div className="mb-6 flex items-center gap-2 text-sm animate-fade-in">
                  <span className="text-muted-foreground">标签:</span>
                  <span className="rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3 py-1 text-indigo-500 font-medium">{tag}</span>
                  <Link href="/blog" className="text-muted-foreground hover:text-foreground ml-2 transition-colors">清除</Link>
                </div>
              )}

              {posts.length > 0 ? (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    {posts.map((post: any) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                  {pagination.totalPages > 1 && (
                    <div className="mt-10 flex justify-center gap-2">
                      {page > 1 && (
                        <Link href={`/blog?page=${page - 1}${tag ? `&tag=${tag}` : ""}`}
                          className="rounded-xl border bg-card px-4 py-2.5 text-sm hover:bg-muted transition-all hover:-translate-y-0.5 hover:shadow-sm">
                          上一页
                        </Link>
                      )}
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                        <Link key={p} href={`/blog?page=${p}${tag ? `&tag=${tag}` : ""}`}
                          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 ${
                            p === page
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                              : "border bg-card hover:bg-muted hover:shadow-sm"
                          }`}>
                          {p}
                        </Link>
                      ))}
                      {page < pagination.totalPages && (
                        <Link href={`/blog?page=${page + 1}${tag ? `&tag=${tag}` : ""}`}
                          className="rounded-xl border bg-card px-4 py-2.5 text-sm hover:bg-muted transition-all hover:-translate-y-0.5 hover:shadow-sm">
                          下一页
                        </Link>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border bg-card py-20 text-center shadow-sm glow-card">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-400/10 blur-2xl" />
                    <div className="animate-float-delayed absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-400/10 blur-2xl" />
                  </div>
                  <div className="relative">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
                      <Calendar className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">暂无文章</h3>
                    <p className="text-muted-foreground">博主正在努力写作中，敬请期待...</p>
                  </div>
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
