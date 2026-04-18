"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Image, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PhotosGalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/photos`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 0) {
          setPhotos(data.data || []);
        }
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
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
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-pink-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-rose-400/5 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
              <Image className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">照片</h1>
              <p className="text-sm text-muted-foreground">记录美好瞬间</p>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Image className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无照片</h3>
              <p className="text-muted-foreground">管理员还未上传照片</p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {photos.map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="break-inside-avoid cursor-pointer group"
                  onClick={() => setSelectedPhoto(index)}
                >
                  <div className="rounded-xl overflow-hidden border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                    <img 
                      src={`${API_BASE}/uploads/photos/${photo.filename}`}
                      alt=""
                      className="w-full h-auto"
                      loading="lazy"
                    />
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
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
          >
            ←
          </button>
          <img 
            src={`${API_BASE}/uploads/photos/${photos[selectedPhoto].filename}`}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}