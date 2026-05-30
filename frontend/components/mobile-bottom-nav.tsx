"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Search, FolderKanban, AtSign } from "lucide-react";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/blog", label: "博客", icon: BookOpen },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/notes", label: "碎碎念", icon: AtSign },
];

const hiddenPrefixes = ["/dashboard", "/login", "/register", "/verify"];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-2xl shadow-black/15 backdrop-blur-2xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-all ${
                active
                  ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20"
                  : "text-muted-foreground active:bg-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
