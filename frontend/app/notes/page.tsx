"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { getToken } from "@/lib/token"
import { useAuth } from "@/components/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Loader2, Heart, MessageCircle, Send, Image, X, ChevronLeft,
  ChevronRight, MoreHorizontal, Trash2, AtSign, Video, BookOpen,
  Sparkles
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

interface RecommendedPost {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
}

interface NoteImage {
  url: string
  type: "image" | "video"
}

interface NoteComment {
  id: string
  content: string
  authorName: string
  authorAvatar: string | null
  userId: string
  createdAt: string
  children: NoteComment[]
}

interface Note {
  id: string
  content: string
  imageUrls: string | null
  videoUrl: string | null
  authorId: string
  authorName?: string
  authorAvatar?: string
  likeCount: number
  commentCount: number
  createdAt: string
  liked: boolean | null
  comments?: NoteComment[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
}

// Image grid component
function ImageGrid({ urls }: { urls: NoteImage[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  if (urls.length === 0) return null

  const gridClass = urls.length === 1
    ? "grid-cols-1"
    : urls.length === 2
    ? "grid-cols-2"
    : "grid-cols-2 sm:grid-cols-3"

  return (
    <>
      <div className={`grid ${gridClass} gap-1.5 rounded-xl overflow-hidden`}>
        {urls.slice(0, 9).map((img, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className={`relative bg-muted overflow-hidden cursor-zoom-in ${
              urls.length === 1 ? "aspect-video max-h-80" : "aspect-square min-h-24"
            } hover:opacity-90 transition-opacity`}
          >
            {img.type === "video" ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black/60">
                <Video className="w-8 h-8 text-white/80" />
              </div>
            ) : (
              <img
                src={img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
            {urls.length > 9 && i === 8 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{urls.length - 9}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full">
            <X className="w-6 h-6" />
          </button>
          {lightbox > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              className="absolute left-4 text-white p-2 hover:bg-white/20 rounded-full">
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          <img
            src={urls[lightbox].url.startsWith("http") ? urls[lightbox].url : `${API_BASE}${urls[lightbox].url}`}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox < urls.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              className="absolute right-4 text-white p-2 hover:bg-white/20 rounded-full">
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <div className="absolute bottom-4 text-white text-sm">{lightbox + 1} / {urls.length}</div>
        </div>
      )}
    </>
  )
}

// Comment input component
function CommentInput({ noteId, onComment }: { noteId: string; onComment: () => void }) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/api/notes/${noteId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text })
      })
      if (res.ok) {
        setText("")
        onComment()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder="写评论..."
        className="min-h-11 flex-1 rounded-full bg-muted/50 px-4 text-sm outline-none transition-all focus:ring-2 focus:ring-rose-500/25"
      />
      <button onClick={submit} disabled={!text.trim() || loading}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white disabled:opacity-40 transition-all hover:scale-105">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  )
}

// Comment list
function CommentList({ comments }: { comments: NoteComment[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? comments : comments.slice(0, 2)
  return (
    <div className="mt-2 space-y-2">
      {visible.map(c => (
        <div key={c.id} className="text-sm">
          <span className="font-semibold text-foreground">{c.authorName || "匿名"}</span>
          <span className="ml-1.5 text-muted-foreground">{c.content}</span>
          {c.children?.map(child => (
            <div key={child.id} className="ml-4 mt-1 border-l border-border/20 pl-2">
              <span className="font-semibold text-foreground text-xs">{child.authorName || "匿名"}</span>
              <span className="ml-1.5 text-muted-foreground text-xs">{child.content}</span>
            </div>
          ))}
        </div>
      ))}
      {comments.length > 2 && !expanded && (
        <button onClick={() => setExpanded(true)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">
          查看全部 {comments.length} 条评论
        </button>
      )}
    </div>
  )
}

// Note card
function NoteCard({ note, onDelete, onUpdate }: {
  note: Note; onDelete: (id: string) => void; onUpdate: (updated: Note) => void
}) {
  const [liked, setLiked] = useState(note.liked ?? false)
  const [likeCount, setLikeCount] = useState(note.likeCount ?? 0)
  const [showComments, setShowComments] = useState(false)
  const [commentList, setCommentList] = useState<NoteComment[]>(note.comments ?? [])
  const [commentCount, setCommentCount] = useState(note.commentCount ?? 0)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()

  const images: NoteImage[] = (() => {
    if (!note.imageUrls) return []
    try {
      return JSON.parse(note.imageUrls).map((u: string) => ({ url: u, type: "image" as const }))
    } catch { return [] }
  })()

  const handleLike = async () => {
    if (!user) return
    // Optimistic update
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    const token = getToken()
    const method = wasLiked ? "DELETE" : "POST"
    const res = await fetch(`${API_BASE}/api/notes/${note.id}/like`, {
      method, headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      // Revert on failure
      setLiked(wasLiked)
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1)
    }
  }

  const handleDelete = async () => {
    if (!confirm("确定删除这条动态？")) return
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/notes/${note.id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      alert("删除失败，请重试")
      return
    }
    onDelete(note.id)
  }

  const refreshComments = async () => {
    const res = await fetch(`${API_BASE}/api/notes/${note.id}/comments`)
    if (res.ok) {
      const data = await res.json()
      if (data.code === 0) {
        setCommentList(data.data)
        setCommentCount(data.data.length)
      }
    }
  }

  return (
    <div className="relative rounded-2xl glass-card p-4 transition-all duration-300 hover:shadow-xl group animate-fade-in-up sm:p-5">
      {/* Author + menu */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-md">
          {note.authorAvatar ? (
            <img src={note.authorAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (note.authorName || "博主")[0].toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{note.authorName || "博主"}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</div>
        </div>
        {user && user.id === note.authorId && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 rounded-xl glass-card shadow-xl border border-border/30 overflow-hidden min-w-[100px]">
                <button onClick={() => { setMenuOpen(false); handleDelete() }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> 删除
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p className="mb-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground/90">{note.content}</p>

      {/* Images */}
      <ImageGrid urls={images} />

      {/* Video */}
      {note.videoUrl && (
        <video
          src={`${API_BASE}${note.videoUrl}`}
          controls
          className="w-full rounded-xl mt-2 max-h-72 bg-black"
        />
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3 border-t border-border/20 pt-3">
        <button
          onClick={handleLike}
          className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-all ${
            liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={() => { setShowComments(!showComments); if (!showComments && commentList.length === 0) refreshComments(); }}
          className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-all hover:text-sky-400"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-2">
          <CommentList comments={commentList} />
          {user && <CommentInput noteId={note.id} onComment={refreshComments} />}
        </div>
      )}
    </div>
  )
}

// Compose modal
function ComposeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [content, setContent] = useState("")
  const [uploads, setUploads] = useState<NoteImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    const token = getToken()
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`${API_BASE}/api/upload/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    if (res.ok) {
      const data = await res.json()
      if (data.code === 0) {
        setUploads(prev => [...prev, { url: data.data.url, type: data.data.type }])
      }
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    setUploading(true)
    Array.from(files).forEach(f => {
      if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
        uploadFile(f)
      }
    })
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeUpload = (url: string) => setUploads(prev => prev.filter(u => u.url !== url))

  const handlePost = async () => {
    if (!content.trim()) return
    setPosting(true)
    try {
      const token = getToken()
      const imageUrls = uploads.filter(u => u.type === "image").map(u => u.url)
      const videoUrl = uploads.find(u => u.type === "video")?.url || null
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, imageUrls, videoUrl })
      })
      if (res.ok) {
        onSuccess()
        onClose()
      }
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}>
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-hidden rounded-2xl glass-card shadow-2xl animate-bounce-in"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <h2 className="font-bold">发布碎碎念</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="max-h-[60dvh] overflow-y-auto p-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="今天想分享点什么..."
            className="h-36 w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground/50 sm:h-40 sm:text-sm"
            autoFocus
          />

          {/* Upload preview */}
          {uploads.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {uploads.map((u, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                  {u.type === "video" ? (
                    <video src={`${API_BASE}${u.url}`} className="w-full h-full object-cover" />
                  ) : (
                    <img src={`${API_BASE}${u.url}`} alt="" className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => removeUpload(u.url)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`mt-3 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragOver ? "border-rose-400 bg-rose-500/5" : "border-border/40 hover:border-rose-500/30"
            }`}
          >
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Image className="w-4 h-4" />
                <span>图片</span>
              </div>
              <div className="w-px h-4 bg-border/40" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Video className="w-4 h-4" />
                <span>视频</span>
              </div>
            </div>
            {uploading && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> 上传中...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/30">
          <span className="text-xs text-muted-foreground">{content.length} / 10000</span>
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            发布
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [recommendedPosts, setRecommendedPosts] = useState<RecommendedPost[]>([])
  const { user } = useAuth()
  const loadingRef = useRef(false)

  // 获取推荐阅读
  useEffect(() => {
    async function fetchRecommended() {
      try {
        const res = await fetch(`${API_BASE}/api/public/posts?page=0&limit=5`)
        const data = await res.json()
        if (data.code === 0 && data.data?.posts) {
          setRecommendedPosts(data.data.posts.slice(0, 5))
        }
      } catch { /* ignore */ }
    }
    fetchRecommended()
  }, [])

  const fetchNotes = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current || (!append && !hasMore)) return
    loadingRef.current = true
    setLoading(!append)
    try {
      const res = await fetch(`${API_BASE}/api/public/notes?page=${pageNum}&limit=20`)
      const data = await res.json()
      if (data.code === 0) {
        const list = data.data.map((n: any) => ({
          ...n,
          authorName: n.authorName || "博主",
          authorAvatar: n.authorAvatar || null,
        }))
        setNotes(prev => append ? [...prev, ...list] : list)
        setHasMore(list.length === 20)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [hasMore])

  useEffect(() => { fetchNotes(0) }, [fetchNotes])

  const loadMore = () => {
    if (hasMore && !loadingRef.current) {
      const next = page + 1
      setPage(next)
      fetchNotes(next, true)
    }
  }

  const handleDelete = (id: string) => setNotes(prev => prev.filter(n => n.id !== id))

  const handleNoteUpdate = (updated: Note) =>
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Background */}
        {/* 7:3 split layout */}
        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* Left — main feed (7 parts) */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="mb-6 rounded-2xl glass-card p-5 text-left animate-fade-in-up sm:mb-8 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-xl shadow-rose-500/25">
                    <AtSign className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                      <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">碎碎念</span>
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">记录生活，分享每一刻</p>
                  </div>
                </div>
                {user && (
                  <button
                    onClick={() => setComposeOpen(true)}
                    className="hidden min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 sm:flex"
                  >
                    <Send className="h-4 w-4" />
                    发布
                  </button>
                )}
              </div>
            </div>

            {/* Feed — 瀑布流两列 */}
            <div className="columns-1 gap-4 space-y-4 xl:columns-2">
              {notes.map((note, i) => (
                <div key={note.id} style={{ animationDelay: `${i * 0.05}s` }} className="break-inside-avoid">
                  <NoteCard note={note} onDelete={handleDelete} onUpdate={handleNoteUpdate} />
                </div>
              ))}

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">还没有碎碎念，来发布第一条吧</p>
                </div>
              ) : hasMore ? (
                <button onClick={loadMore} className="w-full min-h-12 rounded-xl glass-card text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  加载更多
                </button>
              ) : null}
            </div>
          </div>

          {/* Right — 推荐阅读 (3 parts) */}
          <aside className="w-full shrink-0 lg:w-72">
            <div className="rounded-2xl glass-card p-4 lg:sticky lg:top-24 space-y-4">
              {/* 推荐标题 */}
              <div className="flex items-center gap-2 px-2">
                <Sparkles className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-bold">推荐阅读</span>
              </div>

              {/* 推荐阅读 */}
              <div className="space-y-3">
                {recommendedPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 px-2">暂无文章</p>
                ) : (
                  recommendedPosts.map(post => (
                    <a
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex gap-3 p-2 rounded-xl hover:bg-muted/30 transition-all"
                    >
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-rose-400/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug group-hover:text-rose-400 transition-colors line-clamp-2">
                          {post.title}
                        </p>
                        {post.excerpt && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.excerpt}</p>
                        )}
                      </div>
                    </a>
                  ))
                )}
              </div>

              {/* 碎碎念说明 */}
              <div className="pt-3 border-t border-border/20">
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  碎碎念是我分享生活点滴、技术感悟和日常思考的地方。欢迎留言交流。
                </p>
              </div>

              {/* 右侧发布按钮 */}
              {user && (
                <button
                  onClick={() => setComposeOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Send className="h-4 w-4" />
                  发布碎碎念
                </button>
              )}
            </div>
          </aside>
        </div>
        </div>
      </main>
      <Footer />

      {user && (
        <button
          onClick={() => setComposeOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-2xl shadow-rose-500/30 transition-transform active:scale-95 sm:hidden"
          aria-label="发布碎碎念"
        >
          <Send className="h-5 w-5" />
        </button>
      )}

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSuccess={() => { fetchNotes(0); setPage(0); setHasMore(true); }}
        />
      )}
    </div>
  )
}
