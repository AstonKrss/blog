"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, BookOpen, Calendar, Clock, Filter, X } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  slug: string;
  title: string;
  content?: string;
  excerpt?: string;
  createdAt?: string;
  readingTime?: number;
  tags?: (string | { name: string; slug: string })[];
}

interface Tag { slug: string; name: string; count?: number }

interface ArchiveGroup {
  label: string;
  key: string;
  posts: Post[];
  open: boolean;
}

const gradients = [
  "from-rose-500 to-pink-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-purple-500",
];

interface PostCardProps {
  post: Post;
  index: number;
  onHover: (id: string | null) => void;
}

function PostCard({ post, index, onHover }: PostCardProps) {
  const gradient = gradients[index % gradients.length];

  return (
    <article
      id={`post-${post.id}`}
      className="group relative rounded-2xl glass-card p-5 overflow-hidden transition-all duration-400 hover:-translate-y-1 hover:shadow-xl"
      onMouseEnter={() => onHover(post.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-400`} />
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

      <div className="relative">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs font-medium text-rose-500/80 bg-rose-500/10 px-2 py-0.5 rounded-full">
                {typeof tag === "string" ? tag : (tag as any).name || ""}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-bold text-base group-hover:text-rose-500 transition-colors leading-tight mb-2 line-clamp-2">
          {post.title}
        </h3>

        {/* Show 2-3 lines of article content, fallback to excerpt */}
        {(() => {
          const text = post.content
            ? post.content.replace(/[#*`\[\]!>]/g, "").replace(/\n+/g, " ").trim()
            : post.excerpt || "";
          const preview = text.length > 180 ? text.slice(0, 180) + "…" : text;
          if (!preview) return null;
          return (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-3">
              {preview}
            </p>
          );
        })()}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          )}
          {post.readingTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime} 分钟
            </span>
          )}
          <Link
            href={`/blog/${post.slug}`}
            className="ml-auto text-xs text-rose-500 hover:text-rose-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            阅读 →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BlogTOC({ posts, tags = [] }: { posts: Post[]; tags?: Tag[] }) {
  const [groups, setGroups] = useState<ArchiveGroup[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [activePost, setActivePost] = useState<string | null>(null);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);

  // Group posts by year/month
  useEffect(() => {
    const yearMonthMap = new Map<string, Post[]>();

    posts.forEach((post) => {
      if (post.createdAt) {
        const date = new Date(post.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        if (!yearMonthMap.has(key)) yearMonthMap.set(key, []);
        yearMonthMap.get(key)!.push(post);
      } else {
        if (!yearMonthMap.has("uncategorized")) yearMonthMap.set("uncategorized", []);
        yearMonthMap.get("uncategorized")!.push(post);
      }
    });

    const sorted = Array.from(yearMonthMap.entries()).sort((a, b) => {
      if (a[0] === "uncategorized") return 1;
      if (b[0] === "uncategorized") return -1;
      return b[0].localeCompare(a[0]);
    });

    const newGroups: ArchiveGroup[] = sorted.map(([key, groupPosts]) => {
      let label = key;
      if (key !== "uncategorized") {
        const [year, month] = key.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        label = `${year} 年 ${date.toLocaleDateString("zh-CN", { month: "long" })}`;
      } else {
        label = "未分类";
      }
      return { label, key, posts: groupPosts, open: true };
    });

    setGroups(newGroups);
    setExpandedYears(new Set(newGroups.map((g) => g.key.split("-")[0])));
    setExpandedMonths(new Set(newGroups.map((g) => g.key)));
  }, [posts]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleTOCScrollTo = (postId: string) => {
    setActivePost(postId);
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-rose-500/40");
      setTimeout(() => el.classList.remove("ring-2", "ring-rose-500/40"), 1500);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* ── Left TOC Sidebar ── */}
      <aside className="w-full lg:w-72 shrink-0">
        <div className="rounded-2xl glass-card p-5 sticky top-24 max-h-[calc(100vh-180px)] overflow-y-auto space-y-4">
          {/* TOC Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-border/30">
            <BookOpen className="h-4 w-4 text-rose-500" />
            <span className="font-semibold text-sm">目录</span>
            <span className="ml-auto text-xs text-muted-foreground">{posts.length} 篇</span>
          </div>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Filter className="h-3 w-3" />
                标签
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 8).map((t) => (
                  <Link
                    key={t.slug}
                    href={`/blog?tag=${t.slug}`}
                    className="tag-pill rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Year/Month/Post tree */}
          <nav className="space-y-1">
            {groups.map((group) => {
              const [year] = group.key === "uncategorized" ? ["uncategorized"] : group.key.split("-");
              const isYearOpen = expandedYears.has(year);

              return (
                <div key={group.key}>
                  {/* Year */}
                  <button
                    onClick={() => year !== "uncategorized" && toggleYear(year)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 hover:bg-muted/50 group"
                  >
                    <ChevronDown
                      className={`h-4 w-4 text-rose-500 transition-transform duration-300 ${isYearOpen ? "" : "-rotate-90"}`}
                    />
                    <span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                      {year === "uncategorized" ? "未分类" : year}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      {group.posts.length}
                    </span>
                  </button>

                  {/* Months & Posts */}
                  <div
                    className={`overflow-hidden transition-all duration-400 ease-out ${
                      isYearOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    {/* Single "month" for each group */}
                    <button
                      onClick={() => toggleMonth(group.key)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${expandedMonths.has(group.key) ? "" : "-rotate-90"}`}
                      />
                      <span className="font-medium">
                        {group.key === "uncategorized" ? "" : group.label.split(" ")[1]}
                      </span>
                      <span className="text-muted-foreground/50 text-[10px]">({group.posts.length})</span>
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-out ${
                        expandedMonths.has(group.key) ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="ml-4 space-y-0.5 pb-1">
                        {group.posts.map((post) => {
                          const isActive = activePost === post.id || hoveredPost === post.id;
                          return (
                            <button
                              key={post.id}
                              onClick={() => handleTOCScrollTo(post.id)}
                              onMouseEnter={() => setHoveredPost(post.id)}
                              onMouseLeave={() => setHoveredPost(null)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 truncate ${
                                isActive
                                  ? "bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-500 font-semibold"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              }`}
                            >
                              {post.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ── Right Content: Article Cards ── */}
      <div className="flex-1 min-w-0 space-y-3">
        {groups.map((group, gi) =>
          group.posts.map((post, pi) => (
            <PostCard
              key={post.id}
              post={post}
              index={gi * 10 + pi}
              onHover={setHoveredPost}
            />
          ))
        )}
      </div>
    </div>
  );
}
