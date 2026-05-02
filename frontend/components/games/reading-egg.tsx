"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Copy, Check, X } from "lucide-react";

const EGGS = [
  { text: "坚持看到这里的都是真爱 💕", bg: "from-rose-500 to-pink-500" },
  { text: "技术人的浪漫，就是认真看完每一篇文章 ✨", bg: "from-orange-500 to-amber-400" },
  { text: "读到这里的你，一定是个爱学习的人 🎯", bg: "from-emerald-500 to-teal-500" },
  { text: "恭喜发现彩蛋！你的阅读耐心值已满级 🏆", bg: "from-violet-500 to-purple-500" },
  { text: "学无止境，一起加油 🚀", bg: "from-cyan-500 to-blue-500" },
  { text: "看完文章了？来工具箱试试安全工具吧 🛡️", bg: "from-pink-500 to-rose-500" },
  { text: "恭喜解锁隐藏成就：深度阅读者 📜", bg: "from-yellow-500 to-orange-400" },
];

export function ReadingEgg({ postId }: { postId: string }) {
  const [shown, setShown] = useState(false);
  const [egg, setEgg] = useState<typeof EGGS[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const seenKey = `egg_seen_${postId}`;

  useEffect(() => {
    if (localStorage.getItem(seenKey)) return;
    let triggered = false;

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const progress = scrollTop / docHeight;
      if (progress >= 0.8 && !triggered) {
        triggered = true;
        const chosen = EGGS[Math.floor(Math.random() * EGGS.length)];
        setEgg(chosen);
        setShown(true);
        localStorage.setItem(seenKey, "1");
      }
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [postId, seenKey]);

  const handleCopy = () => {
    if (!egg) return;
    navigator.clipboard.writeText(egg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!shown || !egg || dismissed) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-bounce-in max-w-xs">
      <div className={`relative rounded-2xl bg-gradient-to-br ${egg.bg} p-5 shadow-2xl`}>
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-white/80" />
          <span className="text-xs font-semibold text-white/70">彩蛋解锁</span>
        </div>
        <p className="text-sm font-medium text-white leading-relaxed mb-3">{egg.text}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-all"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>
    </div>
  );
}
