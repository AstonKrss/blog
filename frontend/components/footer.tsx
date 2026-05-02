"use client";

import Link from "next/link";
import { Github, Mail, Rss, Globe, Heart, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";

export function Footer() {
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="relative border-t">
        {/* Decorative gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />

        <div className="container mx-auto px-4 py-16">
          {/* Main footer grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="group space-y-4 p-5 rounded-2xl glass-card animate-fade-in-up transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-lg shadow-rose-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-rose-500/30">
                  <span className="text-white font-bold">A</span>
                </div>
                <div>
                  <span className="text-lg font-bold gradient-text">Aston&apos;s Blog</span>
                  <p className="text-xs text-muted-foreground">DevSecOps 实践者</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                探索技术的无限可能，分享安全、开发与 DevOps 的实践经验。
              </p>
              <div className="flex items-center gap-2">
                {[
                  { icon: Rss, href: "/rss", label: "RSS" },
                  { icon: Github, href: "https://github.com/", label: "GitHub", external: true },
                  { icon: Mail, href: "mailto:astonkrss@gmail.com", label: "邮箱" },
                ].map(({ icon: Icon, href, label, external }) => (
                  <a
                    key={label}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="group flex h-9 w-9 items-center justify-center rounded-xl glass-card text-muted-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:text-foreground border-transparent hover:border-rose-500/20"
                    title={label}
                  >
                    <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-120" />
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="group space-y-4 p-5 rounded-2xl glass-card animate-fade-in-up delay-100 transition-all duration-300 hover:-translate-y-1">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                导航
              </h3>
              <ul className="space-y-2.5">
                {[
                  { label: "首页", href: "/" },
                  { label: "博客", href: "/blog" },
                  { label: "归档", href: "/archive" },
                  { label: "标签", href: "/tags" },
                  { label: "搜索", href: "/search" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="h-1 w-1 rounded-full bg-rose-500/0 group-hover:bg-rose-500 transition-all duration-200" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Explore */}
            <div className="group space-y-4 p-5 rounded-2xl glass-card animate-fade-in-up delay-200 transition-all duration-300 hover:-translate-y-1">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                探索
              </h3>
              <ul className="space-y-2.5">
                {[
                  { label: "安全工具箱", href: "/tools" },
                  { label: "成长轨迹", href: "/timeline" },
                  { label: "友链", href: "/friends" },
                  { label: "留言板", href: "/guestbook" },
                  { label: "关于", href: "/about" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="h-1 w-1 rounded-full bg-pink-500/0 group-hover:bg-pink-500 transition-all duration-200" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subscribe */}
            <div className="group space-y-4 p-5 rounded-2xl glass-card animate-fade-in-up delay-300 transition-all duration-300 hover:-translate-y-1">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                订阅更新
              </h3>
              <p className="text-sm text-muted-foreground">
                通过 RSS 订阅第一时间获取更新
              </p>
              <Link
                href="/rss"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95"
              >
                <Rss className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                订阅 RSS
              </Link>
            </div>
          </div>

          {/* Divider with gradient */}
          <div className="my-10 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full glass-card -mt-3">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400" />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>&copy; {currentYear} Aston&apos;s Blog.</span>
              <span className="flex items-center gap-1">
                Built with
                <Heart className="h-3 w-3 text-red-500 animate-pulse" />
                Next.js + Spring Boot
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                网站地图
              </a>
              <span>&middot;</span>
              <span>粤ICP备xxxxxxxx号</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-2xl glass-card shadow-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:border-rose-500/30 ${
          showBackTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="回到顶部"
      >
        <ArrowUp className="h-5 w-5 text-rose-500" />
      </button>
    </>
  );
}