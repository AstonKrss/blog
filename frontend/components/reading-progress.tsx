"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ReadingProgressProps {
  /** Estimated reading time in minutes (pass from server-rendered page) */
  readingTime?: number;
  /** Whether to show reading time badge */
  showTime?: boolean;
}

function estimateReadingTime(): number {
  const wordsPerMinute = 200;
  const text = document.body.innerText || "";
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function ReadingProgress({
  readingTime,
  showTime = true,
}: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showBadge, setShowBadge] = useState(false);
  const [totalTime] = useState(readingTime ?? 0);
  const badgeRef = useRef<HTMLDivElement>(null);
  const appeared = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const pct = totalHeight > 0 ? (scrolled / totalHeight) * 100 : 0;
      setProgress(pct);

      if (!showTime || !totalTime) return;
      // Show badge after 10% scroll
      if (pct > 10 && !appeared.current) {
        appeared.current = true;
        setShowBadge(true);
        setTimeout(() => setShowBadge(false), 3000);
      }

      // Update time left
      if (pct > 2 && pct < 98) {
        const remaining = Math.ceil((totalTime || 5) * (1 - pct / 100));
        setTimeLeft(remaining);
      } else {
        setTimeLeft(null);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showTime, totalTime]);

  return (
    <>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Reading time badge — top-right corner, fades in/out */}
      {showTime && (
        <div
          ref={badgeRef}
          className={`fixed top-4 right-4 z-[61] transition-all duration-500 ${
            showBadge
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="glass-card shadow-xl border border-border/30 px-4 py-2.5 rounded-full flex items-center gap-2 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-medium">
              {timeLeft !== null ? `剩余 ${timeLeft} 分钟` : `约 ${totalTime || 5} 分钟`}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
