"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  replies?: Comment[];
}

export function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/public/comments/${postId}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments || []));
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, authorEmail: email, content }),
      });
      if (res.ok) {
        setContent("");
        const data = await fetch(`/api/public/comments/${postId}`).then((r) => r.json());
        setComments(data.comments || []);
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">昵称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的昵称"
              required
              className="w-full rounded-xl border bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-xl border bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">评论内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法..."
            rows={4}
            required
            className="w-full rounded-xl border bg-gray-50 dark:bg-[#2c2c2e] px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[#007aff] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0066d6] transition-colors disabled:opacity-50 shadow-sm"
        >
          <Send className="h-4 w-4" />
          {loading ? "提交中..." : "发表评论"}
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="rounded-xl border bg-gray-50 dark:bg-[#2c2c2e] p-5 transition-colors">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#007aff]/10 flex items-center justify-center text-sm font-medium text-[#007aff]">
                  {c.authorName[0].toUpperCase()}
                </div>
                <span className="font-medium text-sm">{c.authorName}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
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
