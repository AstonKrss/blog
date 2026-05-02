"use client";

import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const DARK_ROUTES = ["/", "/tools", "/terminal", "/dashboard"];
const LIGHT_ROUTES = ["/blog", "/search", "/tags", "/archive"];

function getDefaultThemeForPath(pathname: string): string {
  if (pathname.startsWith("/blog")) return "light";
  for (const route of DARK_ROUTES) {
    if (pathname === route || pathname.startsWith(route + "/")) return "dark";
  }
  for (const route of LIGHT_ROUTES) {
    if (pathname === route || pathname.startsWith(route + "/")) return "light";
  }
  return "system";
}

export function ThemeClassHandler() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const defaultTheme = getDefaultThemeForPath(pathname);
    if (defaultTheme === "system") return;

    // Only skip if user already set this pathname to a DIFFERENT theme from default.
    // If they haven't touched this page yet, apply the default.
    // This lets users pick "背景图" on homepage (override dark default)
    // and separately pick "深色" on blog (override light default) — each independently.
    const storageKey = "theme-overridden:" + pathname;
    if (sessionStorage.getItem(storageKey) === "1") return;

    const currentIsDefault =
      (defaultTheme === "dark" && resolvedTheme === "dark") ||
      (defaultTheme === "light" && resolvedTheme === "light");

    if (!currentIsDefault) {
      setTheme(defaultTheme);
    }
  }, [pathname, setTheme, resolvedTheme]);

  // Mark this pathname as user-touched when theme changes from default
  useEffect(() => {
    if (!theme || !pathname) return;
    const defaultTheme = getDefaultThemeForPath(pathname);
    // Only flag as overridden if user chose something different from the page default
    if (theme !== defaultTheme && defaultTheme !== "system") {
      const storageKey = "theme-overridden:" + pathname;
      sessionStorage.setItem(storageKey, "1");
    }
  }, [theme, pathname]);

  return null;
}
