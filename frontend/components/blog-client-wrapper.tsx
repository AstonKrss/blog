"use client";

import { BlogTOC } from "@/components/blog-toc";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  createdAt?: string;
  readingTime?: number;
  tags?: (string | { name: string; slug: string })[];
}

interface Tag {
  slug: string;
  name: string;
  count?: number;
}

export function BlogClientWrapper({ posts, tags = [] }: { posts: Post[]; tags?: Tag[] }) {
  return <BlogTOC posts={posts} tags={tags} />;
}
