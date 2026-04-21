import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { Rss, Mail, Check, ExternalLink, Clock, User } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  category: string[];
}

async function getRssFeed(): Promise<RssItem[]> {
  try {
    const res = await fetch(`${API_BASE}/rss.xml`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      // If backend doesn't implement RSS yet, return demo data
      return getDemoRssItems();
    }

    const text = await res.text();
    return parseRssXml(text);
  } catch {
    // Backend not available, show demo
    return getDemoRssItems();
  }
}

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const getValue = (tag: string): string => {
      const tagRegex = new RegExp(`<${tag}[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/${tag}|<${tag}[^>]*>([\s\S]*?)<\/${tag}>`);
      const tagMatch = itemXml.match(tagRegex);
      return tagMatch ? (tagMatch[1] || tagMatch[2] || "").trim() : "";
    };

    const categories: string[] = [];
    const catRegex = /<category[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>|<category[^>]*>([\s\S]*?)<\/category>/g;
    let catMatch;
    while ((catMatch = catRegex.exec(itemXml)) !== null) {
      categories.push((catMatch[1] || catMatch[2] || "").trim());
    }

    items.push({
      title: getValue("title"),
      link: getValue("link"),
      description: getValue("description"),
      pubDate: getValue("pubDate"),
      author: getValue("author"),
      category: categories,
    });
  }

  return items;
}

function getDemoRssItems(): RssItem[] {
  return [
    {
      title: "博客订阅功能上线",
      link: "/blog/rss-subscription",
      description: "欢迎订阅 Aston's Blog，通过 RSS 阅读器第一时间获取更新。",
      pubDate: new Date().toUTCString(),
      author: "Aston",
      category: ["公告"],
    },
    {
      title: "Spring Boot 入门教程",
      link: "/blog/spring-boot-guide",
      description: "从零开始学习 Spring Boot，掌握现代 Java 后端开发。",
      pubDate: new Date(Date.now() - 86400000).toUTCString(),
      author: "Aston",
      category: ["Java", "教程"],
    },
    {
      title: "Next.js 15 新特性解析",
      link: "/blog/nextjs-15-features",
      description: "深入了解 Next.js 15 的 App Router、Server Components 等新特性。",
      pubDate: new Date(Date.now() - 172800000).toUTCString(),
      author: "Aston",
      category: ["前端", "Next.js"],
    },
  ];
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function RssPage() {
  const items = await getRssFeed();

  return (
    <>
      <SEO
        title="RSS 订阅"
        description="通过 RSS 订阅 Aston's Blog，第一时间获取最新文章更新"
        url="/rss"
        type="website"
      />

      <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-900">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative overflow-hidden border-b bg-card/50">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
              <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
                <Rss className="h-8 w-8" />
              </div>

              <h1 className="mb-4 text-4xl font-bold tracking-tight">
                RSS 订阅
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                通过 RSS 阅读器订阅博客，第一时间获取最新文章更新，
                无需每次访问网站刷新的烦恼。
              </p>

              {/* Subscription Info */}
              <div className="grid gap-4 sm:grid-cols-2 max-w-xl mx-auto">
                <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <Rss className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">RSS Feed</p>
                    <code className="text-xs text-muted-foreground">
                      /rss.xml
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Atom Feed</p>
                    <code className="text-xs text-muted-foreground">
                      /rss.xml
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How to Subscribe */}
          <section className="mx-auto max-w-4xl px-4 py-12">
            <h2 className="mb-8 text-2xl font-bold">如何使用 RSS</h2>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1 */}
              <div className="rounded-xl border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <span className="text-lg font-bold">1</span>
                </div>
                <h3 className="mb-2 font-semibold">选择阅读器</h3>
                <p className="text-sm text-muted-foreground">
                  下载一个 RSS 阅读器，如 Inoreader、Feedly 或 Reeder。
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <span className="text-lg font-bold">2</span>
                </div>
                <h3 className="mb-2 font-semibold">添加订阅源</h3>
                <p className="text-sm text-muted-foreground">
                  复制博客的 RSS 地址，粘贴到阅读器中订阅。
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">开始阅读</h3>
                <p className="text-sm text-muted-foreground">
                  享受无广告、无推荐的纯净阅读体验。
                </p>
              </div>
            </div>

            {/* Recommended Readers */}
            <div className="mt-8">
              <h3 className="mb-4 font-semibold">推荐阅读器</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: "Feedly", url: "https://feedly.com" },
                  { name: "Inoreader", url: "https://inoreader.com" },
                  { name: "Reeder", url: "https://reederapp.com" },
                  { name: "NetNewsWire", url: "https://netnewswire.com" },
                  { name: "Miniflux", url: "https://miniflux.app" },
                ].map((reader) => (
                  <a
                    key={reader.name}
                    href={reader.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    {reader.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Recent Articles */}
          <section className="mx-auto max-w-4xl px-4 py-12 border-t">
            <h2 className="mb-8 text-2xl font-bold">最近更新</h2>

            <div className="space-y-4">
              {items.map((item, index) => (
                <article
                  key={index}
                  className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-2 text-lg font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <Link href={item.link} className="line-clamp-2">
                          {item.title}
                        </Link>
                      </h3>

                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.pubDate)}
                        </span>

                        {item.author && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.author.split("(")[1]?.replace(")", "") || item.author}
                          </span>
                        )}

                        {item.category && item.category.length > 0 && (
                          <div className="flex items-center gap-2">
                            {item.category.slice(0, 3).map((cat) => (
                              <span
                                key={cat}
                                className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      href={item.link}
                      className="shrink-0 rounded-lg border p-2 hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {items.length === 0 && (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <Rss className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  暂无文章，订阅后将第一时间收到更新通知。
                </p>
              </div>
            )}

            {/* Subscribe CTA */}
            <div className="mt-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white">
              <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">订阅 RSS，不错过任何更新</h3>
                  <p className="text-sm text-white/80">
                    复制以下链接到你的 RSS 阅读器
                  </p>
                </div>
                <code className="rounded-lg bg-white/20 px-4 py-2 font-mono text-sm backdrop-blur-sm">
                  {typeof window !== "undefined" ? window.location.origin : ""}/rss.xml
                </code>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
