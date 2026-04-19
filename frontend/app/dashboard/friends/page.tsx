"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Link2, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface FriendLink {
  id: string;
  name: string;
  url: string;
  description: string;
  avatar: string;
  email: string;
  status: string;
  createdAt: string;
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
      return;
    }
    if (user && user.role === "ADMIN") {
      fetchFriends();
    }
  }, [user, authLoading, router]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Token:", token);
      const res = await fetch(`${API_BASE}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("Response:", data);
      if (data.code === 0) {
        console.log("Friends:", data.data);
        setFriends(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, status: string) => {
    setProcessing(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/friends/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.code === 0) {
        fetchFriends();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
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

  const pendingFriends = friends.filter(f => f.status === "PENDING");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">友链管理</h1>
            <p className="text-muted-foreground">审核友链申请</p>
          </div>
        </div>

        {pendingFriends.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Link2 className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">暂无待审核的友链</h3>
            <p className="text-muted-foreground">申请友链的用户将会在这里显示</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingFriends.map(friend => (
              <div key={friend.id} className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Link2 className="h-6 w-6 text-indigo-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{friend.name}</h3>
                      <a href={friend.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline">
                        {friend.url}
                      </a>
                      {friend.description && (
                        <p className="text-sm text-muted-foreground mt-1">{friend.description}</p>
                      )}
                      {friend.email && (
                        <p className="text-xs text-muted-foreground mt-1">邮箱: {friend.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(friend.id, "APPROVED")}
                      disabled={processing === friend.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      通过
                    </button>
                    <button
                      onClick={() => handleApprove(friend.id, "REJECTED")}
                      disabled={processing === friend.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}