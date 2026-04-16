"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikeStatus();
  }, [postId]);

  const fetchLikeStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setLiked(data.data.liked);
        setCount(data.data.count || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setLiked(data.data.liked);
        setCount(data.data.count || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <button className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card hover:bg-muted transition-colors">
        <Heart className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">...</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLike}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
        liked
          ? "bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-800"
          : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
      <span className="text-sm font-medium">{count || 0}</span>
    </button>
  );
}