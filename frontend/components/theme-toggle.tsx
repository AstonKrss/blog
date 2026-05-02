"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Image, ChevronDown, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const themes = [
  {
    value: "custom",
    icon: Image,
    label: "背景图",
    desc: "使用博主上传的背景图",
  },
  {
    value: "light",
    icon: Sun,
    label: "浅色",
    desc: "明亮简洁的浅色主题",
  },
  {
    value: "dark",
    icon: Moon,
    label: "深色",
    desc: "科技感深色主题",
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) return <div className="h-9 w-9" />;

  const currentTheme = theme || "custom";
  const current = themes.find(t => t.value === currentTheme) || themes[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-xl glass-card hover:bg-muted/50 transition-all duration-200 group"
        aria-label="切换主题"
        title={`当前: ${current.label}`}
      >
        <CurrentIcon className="h-4 w-4 text-foreground/70 group-hover:text-foreground transition-colors" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl glass-card shadow-2xl border border-border/30 overflow-hidden z-50 animate-scale-in">
          <div className="p-1.5">
            <div className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              选择主题
            </div>
            <div className="space-y-0.5">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = currentTheme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => {
                      setTheme(t.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-rose-500/10 to-pink-500/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-gradient-to-br from-rose-500 to-pink-500 shadow-md"
                        : "bg-muted"
                    }`}>
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{t.label}</div>
                      <div className={`text-xs ${isActive ? "text-rose-500/70" : "text-muted-foreground/60"}`}>
                        {t.desc}
                      </div>
                    </div>
                    {isActive && (
                      <Check className="h-4 w-4 text-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme auto-info */}
          {currentTheme !== "custom" && (
            <>
              <div className="border-t border-border/20 mx-2" />
              <div className="px-3 py-2 text-xs text-muted-foreground/60">
                页面会自动切换主题，点击可覆盖
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}