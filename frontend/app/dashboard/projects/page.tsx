"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Loader2, Code, Plus, Edit, Trash2, ExternalLink, Star, X, Upload } from "lucide-react";
import { useAuth } from "@/components/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function ProjectsManagePage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", url: "", demoUrl: "", coverImage: "", techStack: "", featured: false, status: "DRAFT"
  });

  useEffect(() => {
    if (!authLoading && user) {
      loadProjects();
    }
  }, [user, authLoading]);

  const loadProjects = () => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        console.log("Projects response:", data);
        if (data.code === 0) {
          setProjects(data.data || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("请填写项目名称");
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        editing ? `${API_BASE}/api/projects/${editing.id}` : `${API_BASE}/api/projects`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (data.code === 0) {
        alert(editing ? "更新成功" : "创建成功");
        setShowModal(false);
        setEditing(null);
        setForm({ name: "", description: "", url: "", demoUrl: "", coverImage: "", techStack: "", featured: false, status: "DRAFT" });
        loadProjects();
      } else {
        alert(data.message || "操作失败");
      }
    } catch { alert("操作失败"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        setProjects(projects.filter(p => p.id !== id));
      } else {
        alert(data.message || "删除失败");
      }
    } catch { alert("删除失败"); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setForm({ ...form, coverImage: data.data });
      }
    } catch { alert("上传失败"); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                <Code className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">项目管理</h1>
                <p className="text-sm text-muted-foreground">管理作品集</p>
              </div>
            </div>
            <button
              onClick={() => { setEditing(null); setForm({ name: "", description: "", url: "", demoUrl: "", coverImage: "", techStack: "", featured: false, status: "DRAFT" }); setShowModal(true); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
            >
              <Plus className="h-4 w-4" />
              新建项目
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div key={project.id} className="rounded-xl border bg-white/80 dark:bg-slate-900/80 p-4 shadow-sm">
                  {project.coverImage && (
                    <img src={project.coverImage} alt={project.name} className="h-32 w-full object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{project.name}</h3>
                    <div className="flex gap-1">
                      {project.featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      {project.status === "PUBLISHED" ? (
                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">已发布</span>
                      ) : (
                        <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">草稿</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                  <div className="flex gap-2 border-t pt-3">
                    <button
                      onClick={() => { setEditing(project); setForm(project); setShowModal(true); }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted py-2 text-sm hover:bg-emerald-500/10"
                    >
                      <Edit className="h-4 w-4" /> 编辑
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted py-2 text-sm text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white/50 py-12 text-center">
              <Code className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">暂无项目</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> 创建第一个项目
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-auto">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? "编辑项目" : "新建项目"}</h3>
              <button onClick={() => setShowModal(false)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="项目名称 *"
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="项目描述"
                rows={3}
                className="w-full resize-none rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="GitHub 链接"
                  className="rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <input
                  type="url"
                  value={form.demoUrl}
                  onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
                  placeholder="演示链接"
                  className="rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">封面图</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50">
                      <Upload className="h-4 w-4" /> 上传图片
                    </div>
                  </label>
                  {form.coverImage && (
                    <img src={form.coverImage} alt="预览" className="h-16 w-16 rounded-lg object-cover" />
                  )}
                </div>
              </div>
              <input
                type="text"
                value={form.techStack}
                onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                placeholder="技术栈 (逗号分隔，如 React, Node.js)"
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">推荐项目</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="rounded-xl border bg-muted/50 px-4 py-2.5"
                >
                  <option value="DRAFT">草稿</option>
                  <option value="PUBLISHED">发布</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? "更新项目" : "创建项目")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}