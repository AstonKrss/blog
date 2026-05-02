"use client"
import { getToken, clearToken } from "@/lib/token"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Image, Upload, Trash2, GripVertical, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PhotosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingFromFrontend, setSyncingFromFrontend] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
      return;
    }
    if (user && user.role === "ADMIN") {
      loadPhotos();
    }
  }, [user, authLoading, router]);

  const loadPhotos = () => {
    fetch(`${API_BASE}/api/photos`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setPhotos(data.data || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const token = getToken();

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);

      try {
        const res = await fetch(`${API_BASE}/api/photos/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (data.code === 0) {
          loadPhotos();
        }
      } catch (err) {
        console.error(err);
      }
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这张照片？")) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/photos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 0) {
        setPhotos(photos.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/photos/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 0) {
        loadPhotos();
        alert("同步成功！");
      } else {
        alert("同步失败: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("同步失败");
    }
    setSyncing(false);
  };

  const handleSyncFromFrontend = async () => {
    if (!confirm("这将从 frontend/public/tree/photos/ 复制照片到 uploads/photos/，并更新数据库。是否继续？")) {
      return;
    }
    setSyncingFromFrontend(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/photos/sync-from-frontend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 0) {
        loadPhotos();
        alert(`成功同步 ${data.data} 张照片！`);
      } else {
        alert("同步失败: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("同步失败");
    }
    setSyncingFromFrontend(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>请先登录</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                <Image className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">照片管理</h1>
                <p className="text-sm text-muted-foreground">上传和管理照片</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSyncFromFrontend}
                disabled={syncingFromFrontend}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                title="从 frontend/public/tree/photos/ 同步"
              >
                {syncingFromFrontend ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                同步前端照片
              </button>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                刷新数据库
              </button>
              <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:shadow-xl transition-all">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploading ? "上传中..." : "上传照片"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无照片，点击上方按钮上传</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="group relative rounded-xl overflow-hidden border bg-card">
                  <img 
                    src={`${API_BASE}/uploads/photos/${photo.filename}`} 
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}