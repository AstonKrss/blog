"use client";

import { marked } from "marked";
import { useEffect, useState } from "react";

export function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    marked.setOptions({ 
      breaks: true, 
      gfm: true,
      pedantic: false,
    });
    setHtml(marked.parse(content) as string);
  }, [content]);

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
