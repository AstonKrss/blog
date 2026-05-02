import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BlogClientWrapper } from "@/components/blog-client-wrapper";
import { BookOpen, Search, Filter, X } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getPosts(page = 1, tag = "") {
  try {
    // Request content for preview text generation
    let url = `${API_BASE}/api/public/posts?page=${page}&limit=12&content=1`;
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

const tagGradients = [
  "from-rose-500 to-blue-500",
  "from-pink-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-cyan-500 to-blue-500",
  "from-rose-500 to-pink-500",
  "from-violet-500 to-orange-400",
  "from-teal-500 to-green-500",
  "from-fuchsia-500 to-pink-500",
  "from-amber-500 to-yellow-500",
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
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-pink-500/5 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-500/8 to-teal-500/5 blur-[80px]" />
        </div>

        <div className="relative container mx-auto px-4 py-14">
          {/* Page Header */}
          <div className="mb-12 animate-fade-in-up">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-xl shadow-rose-500/20">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black">博客</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">分享技术实践与思考</p>
                </div>
              </div>

              {/* Search */}
              <form action="/search" method="GET" className="hidden sm:block animate-fade-in-up delay-100">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-rose-500" />
                  <input
                    type="text"
                    name="q"
                    placeholder="搜索文章..."
                    className="w-72 pl-11 pr-4 py-3 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all text-sm shadow-sm"
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Main layout: sidebar + content */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="w-full lg:w-64 shrink-0 animate-fade-in-left">
              <div className="rounded-2xl glass-card p-5 sticky top-24 space-y-5">
                {/* Filter header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Filter className="h-4 w-4 text-rose-500" />
                    标签筛选
                  </div>
                  {tag && (
                    <Link href="/blog" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3 w-3" />
                      清除
                    </Link>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/blog"
                    className={`tag-pill rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      !tag
                        ? "bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-md shadow-rose-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    全部
                  </Link>
                  {tags.map((t: any, i: number) => (
                    <Link
                      key={t.slug}
                      href={`/blog?tag=${t.slug}`}
                      className={`tag-pill rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                        tag === t.slug
                          ? `bg-gradient-to-r ${tagGradients[i % tagGradients.length]} text-white shadow-md`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>

                {/* Stats mini card */}
                <div className="rounded-xl bg-gradient-to-br from-rose-500/5 to-orange-400/5 p-4 border border-rose-500/10">
                  <div className="text-xs text-muted-foreground mb-1">当前共</div>
                  <div className="text-2xl font-black gradient-text">{pagination.total || 0}</div>
                  <div className="text-xs text-muted-foreground">篇文章</div>
                </div>
              </div>
            </aside>

            {/* Posts content — Archive TOC layout */}
            <div className="flex-1 min-w-0">
              <BlogClientWrapper posts={posts} tags={tags} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}