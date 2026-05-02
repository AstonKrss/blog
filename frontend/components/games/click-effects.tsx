"use client";

import { useState, useEffect } from "react";
import { Heart, Star, Zap, Sparkles } from "lucide-react";

const EMOJIS = [
  { icon: "❤️", label: "heart" },
  { icon: "⭐", label: "star" },
  { icon: "✨", label: "sparkle" },
  { icon: "💜", label: "purple-heart" },
  { icon: "🧡", label: "orange-heart" },
  { icon: "💚", label: "green-heart" },
];

function createParticle(e: MouseEvent) {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const el = document.createElement("div");
  el.textContent = emoji.icon;
  el.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    pointer-events: none;
    z-index: 99999;
    font-size: ${12 + Math.random() * 12}px;
    transform: translate(-50%, -50%);
    animation: clickParticle_${emoji.label} ${0.6 + Math.random() * 0.5}s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// Inject keyframes for each emoji type
function injectKeyframes() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes clickParticle_heart {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
      100% { opacity: 0; transform: translate(calc(-50% + ${(Math.random() - 0.5) * 60}px), calc(-50% - ${60 + Math.random() * 60}px)) scale(1.2) rotate(${Math.random() * 360}deg); }
    }
    @keyframes clickParticle_star {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5) rotate(0deg); }
      100% { opacity: 0; transform: translate(calc(-50% + ${(Math.random() - 0.5) * 80}px), calc(-50% - ${80 + Math.random() * 80}px)) scale(1) rotate(${Math.random() * 720}deg); }
    }
    @keyframes clickParticle_sparkle {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
      100% { opacity: 0; transform: translate(calc(-50% + ${(Math.random() - 0.5) * 50}px), calc(-50% - ${100 + Math.random() * 50}px)) scale(1.5); }
    }
    @keyframes clickParticle_purple-heart {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
      100% { opacity: 0; transform: translate(calc(-50% + ${(Math.random() - 0.5) * 70}px), calc(-50% - ${90 + Math.random() * 70}px)) scale(1.1) rotate(${Math.random() * 540}deg); }
    }
    @keyframes clickParticle_orange-heart {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
      100% { opacity: 0; transform: translate(calc(-50% + ${(Math.random() - 0.5) * 55}px), calc(-50% - ${70 + Math.random() * 55}px)) scale(1.2) rotate(${Math.random() * 360}deg); }
    }
    @keyframes clickParticle_green-heart {
      0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
      100% { opacity: 0; transform: translate(calc(-50% + ${(Math.random() - 0.5) * 65}px), calc(-50% - ${85 + Math.random() * 65}px)) scale(1) rotate(${Math.random() * 450}deg); }
    }
  `;
  document.head.appendChild(style);
}

export function ClickEffects() {
  useEffect(() => {
    // Respect user preference
    if (localStorage.getItem("clickEffects") === "off") return;

    injectKeyframes();

    const handler = (e: MouseEvent) => {
      // Only on left click
      if (e.button !== 0) return;
      // Avoid triggering on inputs, buttons, links
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.tagName === "A" || target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) return;
      createParticle(e);
    };

    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return null;
}

// Toggle component for user to enable/disable
export function ClickEffectsToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("clickEffects") !== "off");

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("clickEffects", next ? "on" : "off");
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
        enabled ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"
      }`}
      title={enabled ? "点击特效: 开" : "点击特效: 关"}
    >
      <Sparkles className="h-3 w-3" />
      {enabled ? "点击特效 · 开" : "点击特效 · 关"}
    </button>
  );
}
