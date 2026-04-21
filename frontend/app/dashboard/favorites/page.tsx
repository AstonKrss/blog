"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Loader2, Heart, Trash2, FileText } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setFavorites(data.data?.favorites || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRemove = async (postId: string) => {
    if (!confirm("取消收藏？")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/favorite`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setFavorites(favorites.filter(f => f.post?.id !== postId));
      } else {
        alert(data.message || "取消失败");
      }
    } catch { alert("取消失败"); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">收藏</h1>
              <p className="text-sm text-muted-foreground">你收藏的文章</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
          ) : favorites.length > 0 ? (
            <div className="space-y-3">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center gap-4 rounded-xl border bg-white/80 dark:bg-slate-900/80 p-4 shadow-sm"
                >
                  <FileText className="h-5 w-5 shrink-0 text-pink-500" />
                  <Link href={`/blog/${fav.post?.slug}`} className="flex-1 min-w-0 hover:text-pink-500">
                    <h3 className="font-medium truncate">{fav.post?.title || "无标题"}</h3>
                    <p className="text-sm text-muted-foreground">
                      收藏于: {fav.createdAt ? new Date(fav.createdAt).toLocaleDateString("zh-CN") : ""}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleRemove(fav.post?.id)}
                    className="rounded-lg p-2 hover:bg-muted text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white/50 py-12 text-center">
              <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">暂无收藏</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}