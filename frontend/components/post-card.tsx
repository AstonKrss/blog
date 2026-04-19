"use client";

import Link from "next/link";
import { Calendar, Eye, MessageSquare } from "lucide-react";

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
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block overflow-hidden rounded-2xl bg-card dark:bg-[#18181b] border border-border dark:border-gray-800 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 card-hover">
      {post.coverImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-6">
        <h2 className="mb-2 line-clamp-2 text-lg font-semibold group-hover:text-[#007aff] transition-colors text-card-foreground dark:text-white">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed dark:text-gray-400">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground dark:text-gray-500">
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.publishedAt).toLocaleDateString("zh-CN")}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.viewCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {post.commentCount || 0}
          </span>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((pt: any) => (
              <span
                key={pt.tag?.slug || pt.slug || Math.random()}
                className="rounded-full bg-primary/10 dark:bg-primary/20 px-2.5 py-0.5 text-xs text-primary dark:text-blue-400"
              >
                {pt.tag?.name || pt.name || ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
