"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Image } from "lucide-react";
import { useState, useEffect } from "react";

const themes = [
  { value: "light", icon: Sun, label: "浅色" },
  { value: "dark", icon: Moon, label: "深色" },
  { value: "custom", icon: Image, label: "背景图" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-9" />;

  const currentTheme = theme || "light";
  const CurrentIcon = themes.find(t => t.value === currentTheme)?.icon || Sun;

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.value === currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  return (
    <div className="relative">
      <button
        onClick={cycleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary transition-colors"
        aria-label="切换主题"
        title={themes.find(t => t.value === currentTheme)?.label}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
