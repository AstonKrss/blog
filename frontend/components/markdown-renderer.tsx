"use client";

import { marked, Renderer } from "marked";
import { useEffect, useMemo } from "react";

// 生成与后端一致的 ID
function slugify(text: string): string {
  if (!text) return "";
  let slug = text.toLowerCase();
  // 保留中文字符和英文数字
  slug = slug.replace(/[\s\-_]+/g, "-");
  slug = slug.replace(/[^a-z0-9\u4e00-\u9fa5\-]/g, "");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-|-$/g, "");
  return slug;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => {
    if (!content) return "";

    // 自定义渲染器，为标题添加 ID
    const renderer = new Renderer();
    
    renderer.heading = ({ text, depth }) => {
      const id = slugify(text);
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    };

    marked.setOptions({
      breaks: true,
      gfm: true,
      pedantic: false,
      renderer,
    });

    try {
      const result = marked.parse(content);
      return typeof result === "string" ? result : "";
    } catch (err) {
      console.error("Markdown parse error:", err);
      return `<p style="color: red;">内容解析失败</p><pre>${content}</pre>`;
    }
  }, [content]);

  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap
        prose-headings:font-bold prose-headings:text-foreground dark:prose-headings:text-white
        prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h1:scroll-mt-24 prose-h2:scroll-mt-24 prose-h3:scroll-mt-24
        prose-p:text-foreground dark:prose-p:text-gray-200
        prose-a:text-indigo-500 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-gray-700 dark:prose-code:text-gray-200 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:whitespace-pre
        prose-pre:bg-gray-900 dark:prose-pre:bg-[#1a1a1e] prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:text-gray-100 prose-pre:leading-relaxed
        prose-img:rounded-xl prose-img:shadow-md
        prose-blockquote:border-l-indigo-500 prose-blockquote:bg-muted dark:prose-blockquote:bg-gray-800 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-xl
        prose-hr:border-border
        prose-strong:text-foreground dark:prose-strong:text-white
        prose-li:text-foreground dark:prose-li:text-gray-200
        prose-th:border-border prose-td:border-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
