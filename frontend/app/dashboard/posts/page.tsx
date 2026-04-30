"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileText, Edit, Trash2, Eye, Plus } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PostsManagePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/api/posts`, { 
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          setPosts(data.data.posts || []);
        } else {
          setError(data.message || "获取文章失败");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError("请求失败");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p>加载中...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-indigo-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">文章管理</h1>
                <p className="text-sm text-muted-foreground">管理你的所有文章</p>
              </div>
            </div>
            <Link href="/dashboard/write"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Plus className="h-4 w-4" /> 写文章
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden glow-card">
            {posts.length > 0 ? (
              <div className="divide-y">
                {posts.map((post: any) => (
                  <div key={post.id} className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium truncate">{post.title}</h3>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          post.status === "PUBLISHED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          post.status === "DRAFT" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {post.status === "PUBLISHED" ? "已发布" : post.status === "DRAFT" ? "草稿" : "已归档"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {post.slug} · {new Date(post.publishedAt || post.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/blog/${post.slug}`} className="p-2 rounded-lg hover:bg-muted transition-colors" title="查看">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <Link href={`/dashboard/write?id=${post.id}`} className="p-2 rounded-lg hover:bg-muted transition-colors" title="编辑">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <button 
                        onClick={async () => {
                          if (!confirm("确定要删除这篇文章吗？")) return;
                          const token = localStorage.getItem("token");
                          const res = await fetch(`/api/posts/${post.id}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (data.code === 0) {
                            setPosts(posts.filter((p) => p.id !== post.id));
                          } else {
                            alert(data.message || "删除失败");
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="删除">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
                  <FileText className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="mb-2 font-medium">暂无文章</h3>
                <p className="text-sm text-muted-foreground mb-4">开始创作你的第一篇文章吧</p>
                <Link href="/dashboard/write" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <Plus className="h-4 w-4" /> 写文章
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}