"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Quote } from "lucide-react";

const quotes = [
  { text: "代码是写给人看的，顺便给机器运行。", author: "Harold Abelson" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "任何傻瓜都能写出计算机能理解的代码。好的程序员写出人类能理解的代码。", author: "Martin Fowler" },
  { text: "简单是可靠的前提。", author: "Edsger W. Dijkstra" },
  { text: "编程的艺术就是处理复杂性的艺术。", author: "Edsger W. Dijkstra" },
  { text: "不要重复自己（DRY）", author: "Andy Hunt & Dave Thomas" },
  { text: "过早优化是万恶之源。", author: "Donald Knuth" },
  { text: "完美的代码是不存在的。", author: "Katherine" },
  { text: "技术债就像充电宝，早晚要还的。", author: "Unknown" },
  { text: "最好的架构是让变更成本最低的架构。", author: "Ralph Johnson" },
  { text: "一座座技术山峰，等你去攀登。", author: "Aston" },
  { text: "保持热爱，奔赴山海。", author: "Aston" },
  { text: "安全是发展的前提。", author: "Aston" },
];

export function RandomQuote() {
  const [quote, setQuote] = useState(quotes[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  // 客户端才随机选择，避免 hydration 不匹配
  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const getNewQuote = () => {
    setIsAnimating(true);
    let newQuote = quote;
    while (newQuote.text === quote.text && quotes.length > 1) {
      newQuote = quotes[Math.floor(Math.random() * quotes.length)];
    }
    setTimeout(() => {
      setQuote(newQuote);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-rose-500/8 via-pink-500/8 to-orange-400/5 rounded-3xl border border-rose-200/30 dark:border-rose-800/20 p-8 transition-all duration-300 ${isAnimating ? "scale-95 opacity-50" : "scale-100 opacity-100"}`}>
      {/* Decorative quote marks */}
      <div className="absolute top-4 right-6 text-rose-500/10 font-black text-[120px] leading-none select-none">"</div>

      <div className="absolute -top-4 left-6">
        <div className="bg-gradient-to-r from-rose-500 to-orange-400 rounded-full p-3 shadow-lg shadow-rose-500/30">
          <Quote className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="pt-4">
        <p className="text-lg md:text-xl leading-relaxed mb-4 font-medium">
          "{quote.text}"
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">— {quote.author}</span>
          <button
            onClick={getNewQuote}
            className="flex items-center gap-2 text-sm text-rose-500 hover:text-rose-600 transition-colors group"
          >
            <RefreshCw className={`h-4 w-4 ${isAnimating ? "animate-spin" : ""}`} />
            <span className="transition-all group-hover:translate-x-1">换一条</span>
          </button>
        </div>
      </div>
    </div>
  );
}
