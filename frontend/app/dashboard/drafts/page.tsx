"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Loader2, FileText, Plus, Edit, Trash2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/posts?status=DRAFT`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setDrafts(data.data?.posts || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这篇草稿？")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setDrafts(drafts.filter(d => d.id !== id));
      } else {
        alert(data.message || "删除失败");
      }
    } catch { alert("删除失败"); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">草稿箱</h1>
                <p className="text-sm text-muted-foreground">管理你的草稿文章</p>
              </div>
            </div>
            <Link
              href="/dashboard/write"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
            >
              <Plus className="h-4 w-4" />
              新建草稿
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : drafts.length > 0 ? (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center gap-4 rounded-xl border bg-white/80 dark:bg-slate-900/80 p-4 shadow-sm"
                >
                  <FileText className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{draft.title || "无标题"}</h3>
                    <p className="text-sm text-muted-foreground">
                      最后编辑: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString("zh-CN") : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/write?id=${draft.id}`}
                      className="rounded-lg p-2 hover:bg-muted"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="rounded-lg p-2 hover:bg-muted text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white/50 py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">暂无草稿</p>
              <Link
                href="/dashboard/write"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                创建第一篇草稿
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}