"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./auth-context";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "首页" },
    { href: "/blog", label: "博客" },
    { href: "/search", label: "搜索" },
    { href: "/archive", label: "归档" },
    { href: "/tags", label: "标签" },
    { href: "/guestbook", label: "留言" },
    { href: "/friends", label: "友链" },
    { href: "/projects", label: "项目" },
    { href: "/tools", label: "工具箱" },
    { href: "/about", label: "关于" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Aston&apos;s Blog
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName || user.username}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {(user.displayName || user.username)?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm font-medium hover:text-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                控制台
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                退出
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              <User className="h-4 w-4" />
              登录
            </Link>
          )}
        </nav>

        <button
          className="p-2 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t bg-background px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm font-medium ${
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 flex items-center justify-between">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm font-medium">
                  控制台
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="text-sm font-medium text-muted-foreground">
                  退出
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm font-medium">
                登录
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}