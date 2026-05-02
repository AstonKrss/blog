"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

const MESSAGES = [
  {
    style: "color: #ec4899; font-size: 20px; font-weight: bold;",
    text: "🌸 欢迎来到 Aston 的控制台！",
  },
  {
    style: "color: #f97316; font-size: 14px;",
    text: "🔍 你发现了这个秘密角落，说明你有探索精神！",
  },
  {
    style: "color: #22c55e; font-size: 14px;",
    text: "💡 提示：博客还有很多彩蛋等你去发现哦",
  },
  {
    style: "color: #06b6d4; font-size: 12px;",
    text: "⚡ 如果你有好的建议，欢迎给我留言！",
  },
  {
    style: "color: #8b5cf6; font-size: 12px;",
    text: "🛡️ 保持好奇，安全同行",
  },
];

export function ConsoleEasterEgg() {
  useEffect(() => {
    const seen = sessionStorage.getItem("consoleEasterEgg");
    if (seen) return;

    const delay = setTimeout(() => {
      // Check if it's actually a browser console
      if (typeof console !== "undefined") {
        console.log(
          "%c⚡ Aston's Blog Console ⚡",
          "color: #ec4899; font-size: 24px; font-weight: bold; text-shadow: 0 0 10px #ec4899;"
        );
        console.log(
          "%c" + "─".repeat(50),
          "color: #6b7280;"
        );
        MESSAGES.forEach(({ style, text }) => {
          console.log(`%c${text}`, style);
        });
        console.log(
          "%c" + "─".repeat(50),
          "color: #6b7280;"
        );
        console.log(
          "%c💻 你知道吗？技术人最浪漫的事，就是认真读代码",
          "color: #f59e0b; font-size: 11px; font-style: italic;"
        );
      }
      sessionStorage.setItem("consoleEasterEgg", "1");
    }, 2000);

    return () => clearTimeout(delay);
  }, []);

  return null;
}
