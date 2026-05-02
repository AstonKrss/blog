"use client";

import Link from "next/link";
import { Calendar, Eye, MessageSquare, Tag, ArrowRight, Star } from "lucide-react";
import { useState } from "react";

interface PostCardProps {
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    publishedAt: string | null;
    viewCount: number;
    commentCount: number;
    tags?: Array<{ tag: { name: string; slug: string } }>;
  };
  index?: number;
  featured?: boolean;
}

export function PostCard({ post, index = 0, featured = false }: PostCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const tags = post.tags?.slice(0, 3) || [];
  const gradientIndex = index % 5;
  const gradients = [
    "from-rose-500 to-blue-500",
    "from-pink-500 to-pink-500",
    "from-cyan-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-emerald-500 to-green-500",
  ];
  const gradient = gradients[gradientIndex];

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group relative block overflow-hidden rounded-2xl glass-card shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/15 hover:-translate-y-2 hover:border-rose-500/25 ${featured ? "" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Hover glow border effect */}
      <div
        className={`absolute -inset-px rounded-2xl transition-opacity duration-500 pointer-events-none -z-10 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: `linear-gradient(135deg, rgba(244, 63, 94, 0.3) 0%, rgba(236, 72, 153, 0.15) 50%, rgba(249, 115, 22, 0.2) 100%)`,
          filter: "blur(8px)",
        }}
      />

      {/* Cover image — featured gets bigger */}
      {post.coverImage ? (
        <div className={`relative overflow-hidden ${featured ? "aspect-[16/10]" : "aspect-video"}`}>
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          <img
            src={post.coverImage}
            alt={post.title}
            className={`h-full w-full object-cover transition-all duration-700 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            } ${hovered ? "scale-110" : "scale-100"}`}
            onLoad={() => setImageLoaded(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {/* Top badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${gradient} px-2.5 py-1 text-xs font-medium text-white shadow-lg`}>
              <Tag className="h-3 w-3" />
              {featured ? "精选" : "博客"}
            </span>
          </div>
          {/* Featured overlay */}
          {featured && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                <Star className="h-3 w-3" fill="currentColor" />
                Featured
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative overflow-hidden bg-gradient-to-br ${gradient}/20 ${featured ? "aspect-[16/10]" : "aspect-video"}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${gradient} opacity-20`} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${gradient} px-2.5 py-1 text-xs font-medium text-white shadow-lg`}>
              <Tag className="h-3 w-3" />
              {featured ? "精选" : "博客"}
            </span>
          </div>
        </div>
      )}

      {/* Glass overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />

      {/* Content */}
      <div className={`relative space-y-3 ${featured ? "p-6" : "p-5"}`}>
        {/* Title */}
        <h2
          className={`line-clamp-2 text-lg font-bold transition-colors duration-300 ${
            hovered ? "bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent" : "text-foreground"
          } ${featured ? "text-xl" : ""}`}
        >
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className={`line-clamp-2 text-sm text-muted-foreground leading-relaxed ${featured ? "line-clamp-3" : ""}`}>
            {post.excerpt}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((pt: any, i: number) => (
              <span
                key={i}
                className={`rounded-full bg-gradient-to-r ${gradients[i % gradients.length]}/10 px-2.5 py-0.5 text-xs font-medium transition-all duration-200 tag-pill`}
                style={{ color: "inherit" }}
              >
                {pt.tag?.name || pt.name || ''}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.publishedAt).toLocaleDateString("zh-CN")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.viewCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.commentCount || 0}
            </span>
          </div>
          {/* Arrow indicator */}
          <div
            className={`flex items-center gap-1 text-xs font-medium bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent transition-all duration-300 ${
              hovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
            }`}
          >
            阅读
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* Shine effect on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700"
        style={{
          background: hovered
            ? "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)"
            : "none",
        }}
      />
    </Link>
  );
}