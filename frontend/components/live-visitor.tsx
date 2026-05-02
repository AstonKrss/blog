"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function LiveVisitor() {
  const [count, setCount] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval>;

    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public/online`);
        const data = await res.json();
        if (mounted && data.code === 0) {
          setCount(data.data?.online || 0);
          setPulse(true);
          setTimeout(() => setPulse(false), 400);
        }
      } catch {
        if (mounted) setCount(null);
      }
    };

    fetchCount();
    timer = setInterval(fetchCount, 30_000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-[fade-in-up_0.6s_both]">
      <div className="glass-card shadow-xl border border-border/40 px-4 py-2.5 rounded-full flex items-center gap-2">
        <div className="relative">
          <Users className={`h-4 w-4 text-emerald-400 ${pulse ? "scale-125" : "scale-100"} transition-transform duration-300`} />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {count === null ? "—" : count}
        </span>
        <span className="text-sm text-muted-foreground">人在浏览</span>
      </div>
    </div>
  );
}
