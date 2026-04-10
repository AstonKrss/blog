import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Calendar, FileText } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getArchive() {
  try {
    const res = await fetch(`${API_BASE}/api/public/archive`, { next: { revalidate: 60 } });
    const data = await res.json();
    return data.code === 0 ? data.data?.archive || [] : [];
  } catch { return []; }
}

export default async function ArchivePage() {
  const archive = await getArchive();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-cyan-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-teal-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">归档</h1>
              <p className="text-sm text-muted-foreground">按时间浏览所有文章</p>
            </div>
          </div>

          {archive.length > 0 ? (
            <div className="space-y-6">
              {archive.map((year: any) => (
                <div key={year.year} className="relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
                  <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-400/5 blur-2xl" />
                  <h2 className="relative mb-6 text-xl font-bold flex items-center gap-2">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{year.year}</span>
                    <span className="text-sm font-normal text-muted-foreground">年</span>
                    <span className="text-sm font-normal text-muted-foreground">({year.months.reduce((acc: number, m: any) => acc + m.count, 0)} 篇)</span>
                  </h2>
                  {year.months.map((month: any) => (
                    <div key={month.month} className="relative mb-6 last:mb-0">
                      <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                        {month.month} 月
                      </h3>
                      <div className="space-y-1.5 ml-6">
                        {month.posts.map((post: any) => (
                          <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-sm text-muted-foreground group-hover:text-indigo-500 transition-colors">
                              {post.title}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border bg-card py-20 text-center shadow-sm glow-card">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />
              </div>
              <div className="relative">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
                  <Calendar className="h-8 w-8 text-cyan-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">暂无归档</h3>
                <p className="text-muted-foreground">文章归档将会在这里显示</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
