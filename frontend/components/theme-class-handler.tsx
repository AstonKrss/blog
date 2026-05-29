"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_CHOICE_KEY = "theme-user-choice";
const LEGACY_ROUTE_OVERRIDE_PREFIX = "theme-overridden:";

export function ThemeClassHandler() {
  const { setTheme } = useTheme();

  useEffect(() => {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(LEGACY_ROUTE_OVERRIDE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }

    if (!localStorage.getItem(THEME_CHOICE_KEY)) {
      setTheme("custom");
    }
  }, [setTheme]);

  return null;
}
