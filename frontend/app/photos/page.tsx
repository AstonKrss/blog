"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Image, Loader2, ChevronLeft, ChevronRight, X, Camera } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PhotosGalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/photos`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) setPhotos(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const prevPhoto = () => {
    if (selectedPhoto === null) return;
    setSelectedPhoto(selectedPhoto > 0 ? selectedPhoto - 1 : photos.length - 1);
  };
  const nextPhoto = () => {
    if (selectedPhoto === null) return;
    setSelectedPhoto(selectedPhoto < photos.length - 1 ? selectedPhoto + 1 : 0);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-rose-500/8 blur-[80px]" />
        </div>

        <div className="relative container mx-auto px-4 py-14">
          {/* Header */}
          <div className="mb-12 flex items-center gap-4 animate-fade-in-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-xl shadow-pink-500/20">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black">照片</h1>
              <p className="text-sm text-muted-foreground mt-0.5">共 {photos.length} 张照片 · 记录美好瞬间</p>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl glass-card py-24 text-center shadow-sm animate-fade-in">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-float absolute -top-16 -right-16 h-48 w-48 rounded-full bg-pink-400/10 blur-2xl" />
              </div>
              <div className="relative">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                  <Image className="h-8 w-8 text-pink-500" />
                </div>
                <h3 className="mb-3 text-xl font-bold">暂无照片</h3>
                <p className="text-muted-foreground">管理员还未上传照片</p>
              </div>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 stagger-container">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="break-inside-avoid mb-4 animate-fade-in-up cursor-pointer group"
                  style={{ animationDelay: `${0.05 * index}s` }}
                  onClick={() => setSelectedPhoto(index)}
                >
                  <div className="relative rounded-2xl overflow-hidden glass-card shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-transparent hover:border-pink-500/30">
                    <img
                      src={`${API_BASE}/uploads/photos/${photo.filename}`}
                      alt=""
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Lightbox */}
      {selectedPhoto !== null && photos[selectedPhoto] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setSelectedPhoto(null)}>
          <button className="absolute left-4 md:left-8 p-3 rounded-2xl glass-card hover:bg-white/20 transition-all hover:-translate-y-0.5"
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}>
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <img
            src={`${API_BASE}/uploads/photos/${photos[selectedPhoto].filename}`}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="absolute right-4 md:right-8 p-3 rounded-2xl glass-card hover:bg-white/20 transition-all hover:-translate-y-0.5"
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}>
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
          <button className="absolute top-6 right-6 p-2 rounded-xl glass-card hover:bg-white/20 transition-all"
            onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}>
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-mono">
            {selectedPhoto + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}