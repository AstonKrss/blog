"use client"
import { getToken, clearToken } from "@/lib/token"

import { useState, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorUrl: string | null;
  createdAt: string | null;
  replies?: Comment[];
}

export function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchComments = () => {
    fetch(`/api/public/comments/${postId}`)
      .then((r) => r.json())
      .then((data) => {
        let list: Comment[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.comments)) {
          list = data.comments;
        } else if (data && data.data && Array.isArray(data.data)) {
          list = data.data;
        }
        setComments(list);
      });
  };

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/public/comments/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setContent("");
        fetchComments();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">评论</h2>
        {comments.length > 0 && (
          <span className="text-sm text-muted-foreground">({comments.length})</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        {!isLoggedIn && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              登录后才能评论，<a href="/login" className="underline font-medium">点击登录</a>
            </p>
          </div>
        )}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isLoggedIn ? "写下你的想法..." : "请登录后发表评论"}
            rows={4}
            required
            disabled={loading || !isLoggedIn}
            className="w-full rounded-xl border bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !isLoggedIn || !content.trim()}
          className="flex items-center gap-2 rounded-xl bg-[#007aff] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0066d6] transition-colors disabled:opacity-50 disabled:bg-gray-400 shadow-sm"
        >
          <Send className="h-4 w-4" />
          {loading ? "提交中..." : isLoggedIn ? "发表评论" : "请先登录"}
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border bg-gray-50 dark:bg-[#2c2c2e] p-5 transition-colors">
             <div className="mb-3 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-[#007aff]/10 flex items-center justify-center text-sm font-medium text-[#007aff]">
                   {(c.authorName && c.authorName[0]) ? c.authorName[0].toUpperCase() : '?'}
                 </div>
                 <span className="font-medium text-sm">{c.authorName || '匿名'}</span>
               </div>
               {c.createdAt && (
               <span className="text-xs text-muted-foreground">
                 {new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
               </span>
               )}
            </div>
            <p className="text-sm leading-relaxed">{c.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">暂无评论，来做第一个评论的人吧</p>
          </div>
        )}
      </div>
    </div>
  );
}
