"use client";

import { marked } from "marked";
import { useEffect, useState } from "react";

export function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setError(null);
      marked.setOptions({ 
        breaks: true, 
        gfm: true,
        pedantic: false,
      });
      const result = marked.parse(content || "");
      setHtml(typeof result === 'string' ? result : '');
    } catch (err) {
      console.error('Markdown parse error:', err);
      setError('内容解析失败');
      setHtml('');
    }
  }, [content]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <pre className="mt-2 text-xs text-red-500 whitespace-pre-wrap">{content}</pre>
      </div>
    );
  }

  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap
        prose-headings:font-bold prose-headings:text-foreground
        prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
        prose-a:text-indigo-500 prose-a:no-underline hover:prose-a:underline
        prose-code:text-indigo-500 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:whitespace-pre
        prose-pre:bg-gray-900 dark:prose-pre:bg-[#1a1a1e] prose-pre:rounded-xl prose-pre:overflow-x-auto
        prose-img:rounded-xl prose-img:shadow-md
        prose-blockquote:border-l-indigo-500 prose-blockquote:bg-muted prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:rounded-r-xl
        prose-hr:border-border
        prose-strong:text-foreground
        prose-li:text-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
