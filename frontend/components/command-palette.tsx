"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search, Home, BookOpen, Shield, User, Compass, Layers,
  Sun, Moon, Image, Clock, Terminal, Code2, Calculator,
  Sparkles, ArrowRight, FileText, Tag, Archive, Rss,
  FolderOpen, Link2, Zap, ChevronRight, Hash, Star, MessageSquare, Send,
  Gamepad2
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  category: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

// ─── Command Registry ────────────────────────────────────────────────────────

const buildCommands = (
  onThemeChange: (t: string) => void,
  router: ReturnType<typeof useRouter>
): CommandItem[] => [
  // ── Navigation ──────────────────────────────────────────────────────────
  {
    id: "nav-home",
    label: "首页",
    description: "回到主页",
    icon: Home,
    category: "导航",
    keywords: ["home", "首页", "主页", "homepage"],
    shortcut: "G → H",
    action: () => router.push("/"),
  },
  {
    id: "nav-blog",
    label: "博客文章",
    description: "浏览所有文章",
    icon: BookOpen,
    category: "导航",
    keywords: ["blog", "博客", "文章", "posts", "writing"],
    shortcut: "G → B",
    action: () => router.push("/blog"),
  },
  {
    id: "nav-tools",
    label: "工具箱",
    description: "在线开发者工具",
    icon: Shield,
    category: "导航",
    keywords: ["tools", "工具箱", "工具", "security", "devtools"],
    shortcut: "G → T",
    action: () => router.push("/tools"),
  },
  {
    id: "nav-games",
    label: "趣味游戏",
    description: "打字测速、2048、贪吃蛇等趣味游戏",
    icon: Gamepad2,
    category: "导航",
    keywords: ["games", "游戏", "趣味", "play", "typing", "2048", "snake", "贪吃蛇", "打字测速"],
    action: () => router.push("/games"),
  },
  {
    id: "nav-api-tester",
    label: "API 测试器",
    description: "HTTP 请求测试工具",
    icon: Send,
    category: "导航",
    keywords: ["api", "http", "rest", "test", "请求", "调试", "api tester"],
    action: () => router.push("/tools"),
  },
  {
    id: "nav-about",
    label: "关于我",
    description: "了解博主",
    icon: User,
    category: "导航",
    keywords: ["about", "关于", "me", "biography"],
    action: () => router.push("/about"),
  },
  {
    id: "nav-terminal",
    label: "在线终端",
    description: "云端 Linux 终端",
    icon: Terminal,
    category: "导航",
    keywords: ["terminal", "终端", "console", "shell", "linux"],
    action: () => router.push("/terminal"),
  },
  {
    id: "nav-tags",
    label: "标签列表",
    description: "按标签浏览文章",
    icon: Tag,
    category: "导航",
    keywords: ["tags", "标签", "categories"],
    action: () => router.push("/tags"),
  },
  {
    id: "nav-archive",
    label: "归档",
    description: "文章归档列表",
    icon: Archive,
    category: "导航",
    keywords: ["archive", "归档", "timeline", "时间线"],
    action: () => router.push("/archive"),
  },
  {
    id: "nav-guestbook",
    label: "留言板",
    description: "给我留言",
    icon: MessageSquare,
    category: "导航",
    keywords: ["guestbook", "留言", "message", "留言板"],
    action: () => router.push("/guestbook"),
  },
  {
    id: "nav-notes",
    label: "碎碎念",
    description: "生活动态和分享",
    icon: Compass,
    category: "导航",
    keywords: ["notes", "碎碎念", "动态", "生活", "moment", "feed"],
    action: () => router.push("/notes"),
  },
  {
    id: "nav-friends",
    label: "友情链接",
    description: "博主的好友链接",
    icon: Link2,
    category: "导航",
    keywords: ["friends", "friendship", "links", "友链", "朋友"],
    action: () => router.push("/friends"),
  },
  {
    id: "nav-timeline",
    label: "时间线",
    description: "博主成长历程",
    icon: Clock,
    category: "导航",
    keywords: ["timeline", "时间线", "history"],
    action: () => router.push("/about?tab=timeline"),
  },
  {
    id: "nav-search",
    label: "搜索",
    description: "搜索文章",
    icon: Search,
    category: "导航",
    keywords: ["search", "搜索", "find"],
    shortcut: "/",
    action: () => router.push("/search"),
  },
  {
    id: "nav-rss",
    label: "RSS 订阅",
    description: "订阅博客更新",
    icon: Rss,
    category: "导航",
    keywords: ["rss", "feed", "订阅"],
    action: () => router.push("/rss.xml"),
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  {
    id: "theme-dark",
    label: "深色主题",
    description: "切换到深色主题",
    icon: Moon,
    category: "主题",
    keywords: ["dark", "深色", "dark mode", "night"],
    shortcut: "T → D",
    action: () => onThemeChange("dark"),
  },
  {
    id: "theme-light",
    label: "浅色主题",
    description: "切换到浅色主题",
    icon: Sun,
    category: "主题",
    keywords: ["light", "浅色", "light mode", "day"],
    shortcut: "T → L",
    action: () => onThemeChange("light"),
  },
  {
    id: "theme-custom",
    label: "背景图主题",
    description: "使用背景图主题",
    icon: Image,
    category: "主题",
    keywords: ["custom", "background", "背景图", "image", "bg"],
    shortcut: "T → C",
    action: () => onThemeChange("custom"),
  },

  // ── Tools (quick inline) ─────────────────────────────────────────────────
  {
    id: "tool-calc",
    label: "计算器",
    description: "快速计算表达式",
    icon: Calculator,
    category: "工具",
    keywords: ["calc", "calculator", "计算", "math", "数学"],
    action: () => {
      const expr = window.prompt("输入数学表达式（如 2**10, 0.1+0.2, Math.sqrt(16)）：");
      if (expr) {
        try {
          // eslint-disable-next-line no-eval
          const result = Function(`"use strict"; return (${expr})`)();
          alert(`${expr} = ${result}`);
        } catch (e) {
          alert("表达式错误：" + e);
        }
      }
    },
  },
  {
    id: "tool-encode",
    label: "Base64 编解码",
    description: "Base64 编码或解码",
    icon: Code2,
    category: "工具",
    keywords: ["base64", "encode", "decode", "编码", "解码"],
    action: () => {
      const str = window.prompt("输入要 Base64 编解码的字符串：");
      if (str) {
        try {
          const encoded = btoa(unescape(encodeURIComponent(str)));
          const decoded = decodeURIComponent(escape(atob(str)));
          const mode = window.confirm("确定编码？\n\n确定 = 编码\n取消 = 解码");
          alert(mode ? encoded : decoded);
        } catch {
          alert("操作失败，请检查输入是否有效");
        }
      }
    },
  },
  {
    id: "tool-colors",
    label: "颜色转换",
    description: "HEX ↔ RGB ↔ HSL 互转",
    icon: Sparkles,
    category: "工具",
    keywords: ["color", "颜色", "hex", "rgb", "hsl", "converter"],
    action: () => {
      const input = window.prompt("输入颜色（HEX 如 #ff6b6b 或 RGB 如 rgb(255,107,107)）：")?.trim();
      if (input) {
        let r = 0, g = 0, b = 0;
        if (input.startsWith("#") && input.length >= 6) {
          r = parseInt(input.slice(1, 3), 16);
          g = parseInt(input.slice(3, 5), 16);
          b = parseInt(input.slice(5, 7), 16);
        } else if (input.startsWith("rgb")) {
          const m = input.match(/\d+/g);
          if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2]; }
        }
        if (r || g || b) {
          const hex = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
          const hsl = (() => {
            const rn = r / 255, gn = g / 255, bn = b / 255;
            const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
                case gn: h = ((bn - rn) / d + 2) / 6; break;
                case bn: h = ((rn - gn) / d + 4) / 6; break;
              }
            }
            return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
          })();
          alert(`HEX: ${hex}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${hsl})`);
        } else {
          alert("无法解析颜色格式");
        }
      }
    },
  },
  {
    id: "tool-slug",
    label: "Slug 生成器",
    description: "把中文转成 URL-safe slug",
    icon: Hash,
    category: "工具",
    keywords: ["slug", "url", "中文", "slugify", "permalink"],
    action: () => {
      const str = window.prompt("输入中文标题：")?.trim();
      if (str) {
        const slug = str
          .toLowerCase()
          .replace(/[\u4e00-\u9fa5]/g, (c: string) => c.charCodeAt(0).toString(36))
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        alert(slug || "(无法生成)");
      }
    },
  },
  {
    id: "tool-uuid",
    label: "UUID 生成器",
    description: "生成随机 UUID v4",
    icon: Sparkles,
    category: "工具",
    keywords: ["uuid", "guid", "random", "uuid4"],
    action: () => {
      const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
      navigator.clipboard.writeText(uuid).catch(() => {});
      alert(`UUID 生成成功，已复制到剪贴板：\n${uuid}`);
    },
  },
  {
    id: "tool-password",
    label: "密码生成器",
    description: "生成随机安全密码",
    icon: Zap,
    category: "工具",
    keywords: ["password", "密码", "generate", "生成"],
    action: () => {
      const len = parseInt(window.prompt("密码长度（默认 16）：") || "16", 10);
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      const pwd = Array.from({ length: Math.min(Math.max(len, 8), 64) }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      navigator.clipboard.writeText(pwd).catch(() => {});
      alert(`密码已生成并复制：\n${pwd}`);
    },
  },
];

// ─── Fuzzy Search ─────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // 字面量中文字符包含
  if (q && t.includes(q)) return true;
  // 逐字匹配
  let idx = 0;
  for (let i = 0; i < t.length && idx < q.length; i++) {
    if (t[i] === q[idx]) idx++;
  }
  return idx === q.length;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = buildCommands(setTheme, router);

  const filtered = query.trim()
    ? commands.filter(cmd => fuzzyMatch(query, cmd.label) ||
        cmd.keywords.some(k => fuzzyMatch(query, k)))
    : commands;

  // Group by category
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    (acc[cmd.category] ??= []).push(cmd);
    return acc;
  }, {});

  const flatItems = filtered;

  // Flatten selection across groups
  const flatSelectedId = flatItems[selectedIdx]?.id ?? null;

  // Open/close
  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open ? closePalette() : openPalette();
      }
      if (e.key === "/" && !open && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        openPalette();
      }
      if (open && e.key === "Escape") closePalette();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openPalette, closePalette]);

  // Arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIdx]) {
      e.preventDefault();
      flatItems[selectedIdx].action();
      closePalette();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Global trigger button (hint at bottom-right corner)
  const TriggerButton = () => (
    <button
      onClick={openPalette}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full glass-card shadow-xl border border-border/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-rose-500/30 transition-all duration-300 group animate-[fade-in-up_0.6s_both]"
      title="Command Palette (⌘K)"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">搜索...</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded-md bg-muted px-1.5 text-xs font-mono text-muted-foreground group-hover:bg-muted/80">
        <span>⌘</span><span>K</span>
      </kbd>
    </button>
  );

  if (!open) return <TriggerButton />;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
      onClick={(e) => e.target === e.currentTarget && closePalette()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Palette panel */}
      <div className="relative w-full max-w-xl mx-4 glass-card shadow-2xl border border-border/50 overflow-hidden animate-fade-in-scale">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
          <Search className="h-5 w-5 text-rose-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入搜索命令、页面或工具..."
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto py-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {flatItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              没有找到匹配的命令
            </div>
          ) : (
            Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                  {category}
                </div>
                {items.map((item) => {
                  const globalIdx = flatItems.indexOf(item);
                  const Icon = item.icon;
                  const isSelected = globalIdx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      data-idx={globalIdx}
                      onClick={() => { item.action(); closePalette(); }}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 ${
                        isSelected
                          ? "bg-gradient-to-r from-rose-500/15 to-pink-500/10 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-gradient-to-br from-rose-500 to-pink-500 shadow-md"
                          : "bg-muted"
                      }`}>
                        <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground/60 truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                          {item.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ChevronRight className="h-4 w-4 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border/20 px-4 py-2.5 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-4">
            <span><kbd className="font-mono">↑↓</kbd> 选择</span>
            <span><kbd className="font-mono">↵</kbd> 执行</span>
            <span><kbd className="font-mono">ESC</kbd> 关闭</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>⌘K 打开</span>
          </div>
        </div>
      </div>
    </div>
  );
}
