"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Save, Eye, Plus, Tag, Image as ImageIcon, Loader2, PenTool } from "lucide-react";

function WritePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (postId) {
      setIsEdit(true);
      fetchPostData();
    }
  }, [postId]);

  const fetchPostData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const post = data.data?.post || data.data;
        if (post) {
          setTitle(post.title || "");
          setSlug(post.slug || "");
          setExcerpt(post.excerpt || "");
          setContent(post.content || "");
          setCoverImage(post.coverImage || "");
          const postTags = post.tags || [];
          setTags(postTags.map((t: any) => t.tag?.name || t.name || t));
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || !isEdit) setSlug(value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, ""));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (status: string) => {
    if (!title || !content) return;
    setLoading(true);
    try {
      const token = document.cookie.split("; ").find((row) => row.startsWith("auth_token="))?.split("=")[1];
      const url = isEdit ? `/api/posts/${postId}` : "/api/posts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, slug, excerpt, content, coverImage, tags, status }),
      });
      if (res.ok) router.push("/dashboard/posts");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-indigo-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-8">
          {/* Title Bar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                <PenTool className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{isEdit ? "编辑文章" : "写文章"}</h1>
                <p className="text-sm text-muted-foreground">{isEdit ? "修改你的文章" : "创作你的下一篇技术文章"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreview(!preview)}
                className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <Eye className="h-4 w-4" /> {preview ? "编辑" : "预览"}
              </button>
              <button onClick={() => handleSubmit("DRAFT")} disabled={loading}
                className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50">
                <Save className="h-4 w-4" /> 存草稿
              </button>
              <button onClick={() => handleSubmit("PUBLISHED")} disabled={loading || !title || !content}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />{isEdit ? "保存" : "发布"}</>}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
                <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="文章标题"
                  className="w-full border-0 bg-transparent text-2xl font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0" />
                <div className="mt-4 h-px bg-border" />
                {preview ? (
                  <div className="mt-4 prose prose-lg dark:prose-invert max-w-none">
                    {content.split("\n").map((line, i) => (<p key={i}>{line}</p>))}
                  </div>
                ) : (
                  <textarea value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="开始写作...&#10;&#10;支持 Markdown 语法"
                    className="mt-4 w-full min-h-[400px] resize-none border-0 bg-transparent placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed" />
                )}
              </div>
            </div>

            {/* Sidebar Settings */}
            <div className="space-y-4">
              {[
                { label: "链接", icon: null, children: (
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="article-slug"
                    className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                )},
                { label: "摘要", icon: null, children: (
                  <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="文章简短描述..." rows={3}
                    className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                )},
                { label: "封面图", icon: ImageIcon, children: (
                  <>
                    <input type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://example.com/image.jpg"
                      className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    {coverImage && (<div className="mt-3 rounded-xl overflow-hidden"><img src={coverImage} alt="Cover" className="w-full h-32 object-cover" /></div>)}
                  </>
                )},
                { label: "标签", icon: Tag, children: (
                  <>
                    <div className="flex gap-2 mb-3">
                      <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                        placeholder="输入标签"
                        className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                      <button onClick={addTag} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 transition-colors">添加</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-500">
                          {tag}<button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  </>
                )},
              ].map((section, i) => {
                const Icon = section.icon;
                return (
                  <div key={i} className="rounded-2xl border bg-card/80 backdrop-blur-sm p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4" />}{section.label}
                    </h3>
                    {section.children}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function WritePostPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WritePostContent />
    </Suspense>
  );
}
