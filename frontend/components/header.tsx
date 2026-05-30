"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./auth-context";
import {
  Menu, X, User, LogOut, LayoutDashboard, Rss, ChevronDown, Gamepad2,
  Home, BookOpen, Search, Archive, Tags, MessageSquare, Link2, FolderKanban,
  Wrench, AtSign, TreePine, Info, MapPinned, Images, Shield, Library
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSiteSettings } from "./site-context";

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { settings } = useSiteSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const mainLinks = [
    { href: "/", label: "首页", icon: Home },
    { href: "/blog", label: "博客", icon: BookOpen },
    { href: "/search", label: "搜索", icon: Search },
    { href: "/archive", label: "归档", icon: Archive },
    { href: "/tags", label: "标签", icon: Tags },
    { href: "/guestbook", label: "留言", icon: MessageSquare },
    { href: "/friends", label: "友链", icon: Link2 },
    { href: "/projects", label: "项目", icon: FolderKanban },
    { href: "/tools", label: "工具箱", icon: Wrench },
    { href: "/notes", label: "碎碎念", icon: AtSign },
  ];

  const moreLinks = [
    { href: "/security/tools", label: "安全", icon: Shield },
    { href: "/resources", label: "资源", icon: Library },
    { href: "/tree/", label: "圣诞树", icon: TreePine },
    { href: "/about", label: "关于", icon: Info },
    { href: "/travel", label: "旅行", icon: MapPinned },
    { href: "/photos", label: "相册", icon: Images },
  ];

  const gameLinks = [
    { href: "/games", label: "趣味游戏", icon: Gamepad2 },
  ];

  const mobileLinks = [...mainLinks, ...moreLinks, ...gameLinks, { href: "/rss", label: "RSS", icon: Rss }];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-card shadow-xl shadow-black/5 border-b border-white/10"
          : "bg-background/60 backdrop-blur-xl border-b border-border/30"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="relative">
            <img
              src={settings.avatarUrl}
              alt={settings.siteName}
              className="h-10 w-10 rounded-2xl object-cover shadow-lg shadow-rose-500/25 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-rose-500/35 group-hover:scale-110"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-300" />
          </div>
          <div className="hidden min-w-0 sm:flex items-center gap-1">
            <span className="max-w-[160px] truncate text-lg font-black gradient-text xl:max-w-none">{settings.siteName}</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 group ${
                pathname === link.href
                  ? "text-foreground bg-muted/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <span className="relative z-10">{link.label}</span>
              {pathname === link.href && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500" />
              )}
            </Link>
          ))}

          {/* More dropdown */}
          <details className="relative">
            <summary
              className="flex items-center gap-1 px-3.5 py-2 text-sm font-medium text-muted-foreground rounded-xl hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer list-none"
            >
              更多
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&_details[open]_&]:rotate-180" />
            </summary>
            <div className="absolute top-full right-0 mt-2 w-60 rounded-2xl glass-card shadow-2xl border border-white/10 overflow-hidden z-50">
              <div className="p-1.5 space-y-0.5">
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-all duration-150 ${
                      pathname === link.href
                        ? "bg-gradient-to-r from-rose-500/10 to-orange-400/10 text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="my-1.5 border-t border-border/20" />
                <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground/50 uppercase tracking-wider">趣味游戏</div>
                {gameLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-150"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-rose-400/60" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/rss"
            className="hidden md:flex p-2 rounded-xl text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-all duration-200"
            title="RSS 订阅"
          >
            <Rss className="h-4 w-4" />
          </Link>
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-1 ml-1">
              {user.role === "ADMIN" && (
                <Link
                  href="/dashboard/admin"
                  className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-500 rounded-xl hover:bg-orange-500/10 transition-all duration-200"
                >
                  <div className="h-5 w-5 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <LayoutDashboard className="h-3 w-3" />
                  </div>
                  管理
                </Link>
              )}
              <Link href="/dashboard/profile" className="group flex items-center gap-2">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-rose-500/20 transition-all group-hover:ring-rose-500/50"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {(user.displayName || user.username)?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </Link>
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200"
              >
                <LayoutDashboard className="h-4 w-4" />
                控制台
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95"
            >
              <User className="h-4 w-4" />
              登录
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted/30 transition-colors lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={menuOpen}
          >
            <div className="relative w-5 h-5">
              <Menu className={`h-5 w-5 absolute inset-0 transition-all duration-300 ${menuOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`} />
              <X className={`h-5 w-5 absolute inset-0 transition-all duration-300 ${menuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
            </div>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-t border-border/30 bg-background/85 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl shadow-black/15 backdrop-blur-2xl lg:hidden">
          <div className="max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-border/40 bg-card/80 p-3 shadow-xl backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-2">
              {mobileLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href.replace(/\/$/, "")));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-rose-500/15 to-orange-400/10 text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/30 pt-3">
              <ThemeToggle />
              {user ? (
                <div className="flex flex-1 items-center justify-end gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-muted/60 px-4 text-sm font-semibold text-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    控制台
                  </Link>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-red-500/10 px-4 text-sm font-semibold text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    退出
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 text-sm font-bold text-white shadow-lg shadow-rose-500/20"
                >
                  <User className="h-4 w-4" />
                  登录
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
