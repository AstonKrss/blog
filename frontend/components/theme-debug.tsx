"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

// 直接用 useEffect 操作原生 DOM，永远不会被 React 重新渲染影响
export function ThemeDebug() {
  const { theme, resolvedTheme } = useTheme();
  const tickRef = useRef(0);

  useEffect(() => {
    console.log("[ThemeDebug] mounted, theme=", theme);

    // 每次创建新的 div，不依赖 React 渲染
    const tick = ++tickRef.current;

    const el = document.createElement("div");
    el.id = `debug-panel-${tick}`;
    el.style.cssText = `
      position: fixed;
      bottom: 8px;
      left: 8px;
      z-index: 9999999;
      background: rgba(0,0,0,0.95);
      border: 2px solid #f43f5e;
      color: white;
      border-radius: 12px;
      padding: 12px;
      font-size: 11px;
      font-family: monospace;
      max-width: 380px;
      max-height: 320px;
      overflow-y: auto;
      pointer-events: none;
    `;

    document.body.appendChild(el);

    const update = () => {
      const html = document.documentElement;
      const body = document.body;
      const bgDiv = document.querySelector(".bg-background") as HTMLElement;
      const gc = document.querySelector(".glass-card") as HTMLElement;

      const bodyBg = getComputedStyle(body).backgroundColor;
      const htmlBg = getComputedStyle(html).backgroundImage;
      const bodyBeforeBg = getComputedStyle(body, "::before").backgroundImage;
      const bgDivBg = bgDiv ? getComputedStyle(bgDiv).background : "(no el)";
      const glassBg = gc ? getComputedStyle(gc).background : "(no el)";

      el.innerHTML = `
        <div style="font-weight:bold;color:#f43f5e;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:4px">
          Theme Debug [tick:${tick}]
        </div>
        <div>next-themes: <span style="color:#4ade80">${theme || "null"}</span></div>
        <div>resolvedTheme: <span style="color:#4ade80">${resolvedTheme || "null"}</span></div>
        <div>html.class: <span style="color:#facc15">${html.className || "(empty)"}</span></div>
        <div style="margin-top:6px;color:#888">--- layers ---</div>
        <div>html bg-image: <span style="color:#22d3ee;font-size:9px;word-break:break-all">${htmlBg}</span></div>
        <div>body bg: <span style="color:#f472b6">${bodyBg}</span></div>
        <div>body::before: <span style="color:#22d3ee;font-size:9px;word-break:break-all">${bodyBeforeBg}</span></div>
        <div>.bg-background bg: <span style="color:#fb923c">${bgDivBg}</span></div>
        <div>.glass-card bg: <span style="color:#e879f9">${glassBg}</span></div>
      `;

      console.log(`[ThemeDebug tick:${tick}]`, {
        theme, resolvedTheme,
        "html.className": html.className,
        "html.bgImage": htmlBg,
        "body.bg": bodyBg,
        "body::before.bg": bodyBeforeBg,
        ".bg-background.bg": bgDivBg,
        ".glass-card.bg": glassBg,
      });
    };

    update();
    const interval = setInterval(update, 800);

    return () => {
      console.log(`[ThemeDebug tick:${tick}] cleanup`);
      clearInterval(interval);
      el.remove();
    };
  }, [theme, resolvedTheme]);

  return null; // 不渲染任何 React 元素
}
