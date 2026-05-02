"use client";

import { useState, useEffect, useRef } from "react";
import { Music2 } from "lucide-react";

export function MusicVisualizer() {
  const [playing, setPlaying] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));
  const [dismissed, setDismissed] = useState(false);
  const animRef = useRef<number>(0);

  useEffect(() => {
    // Listen to the music player's state by checking localStorage
    const checkMusic = () => {
      const isPlaying = localStorage.getItem("musicPlaying") === "true";
      setPlaying(isPlaying);
    };

    // Poll every 500ms
    const interval = setInterval(checkMusic, 500);
    checkMusic();

    return () => clearInterval(interval);
  }, []);

  // Animate bars when playing
  useEffect(() => {
    if (!playing) {
      setBars(Array(20).fill(0));
      return;
    }

    const animate = () => {
      setBars(prev =>
        prev.map((_, i) => {
          // Create wave-like animation with some randomness
          const base = Math.sin(Date.now() / 200 + i * 0.3) * 0.4 + 0.5;
          const noise = Math.random() * 0.3;
          return Math.min(1, Math.max(0.15, base + noise));
        })
      );
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  if (dismissed || !playing) return null;

  return (
    <div
      className="fixed bottom-20 left-6 z-40 flex flex-col items-center gap-1.5"
      title="音乐播放中"
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-pink-400 transition-all duration-75"
          style={{
            height: `${Math.max(4, h * 20)}px`,
            opacity: 0.5 + h * 0.5,
          }}
        />
      ))}
    </div>
  );
}
