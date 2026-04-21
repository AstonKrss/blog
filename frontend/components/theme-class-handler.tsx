"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeClassHandler() {
  const { theme } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    
    if (theme === 'custom') {
      html.classList.add('theme-custom');
    } else {
      html.classList.remove('theme-custom');
    }
  }, [theme]);

  return null;
}
