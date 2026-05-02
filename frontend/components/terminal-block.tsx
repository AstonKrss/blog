"use client";

import { useState } from "react";
import { Terminal, ChevronRight, Code, BookOpen, User, Coffee, Heart, Folder, FileText } from "lucide-react";

const commands = [
  {
    cmd: "help",
    description: "显示所有可用命令",
    output: [
      "可用命令:",
      "  help     - 显示帮助信息",
      "  about    - 关于我",
      "  skills   - 我的技能",
      "  blog     - 查看博客",
      "  contact  - 联系方式",
      "  coffee   - 请我喝杯咖啡",
      "  clear    - 清除终端",
    ],
  },
  {
    cmd: "about",
    description: "关于我",
    output: [
      "👋 你好，我是 Aston",
      "",
      "🏫 佛山大学在校生",
      "💻 全栈开发工程师",
      "🔒 DevSecOps 实践者",
      "📝 热爱技术，喜欢分享",
      "",
      "欢迎来到我的个人博客！",
    ],
  },
  {
    cmd: "skills",
    description: "我的技能",
    output: [
      "🛠️ 技术栈:",
      "",
      "Frontend: Next.js, React, TypeScript, Tailwind CSS",
      "Backend:  Spring Boot, Java, Node.js, Python",
      "Database: MySQL, Redis, MongoDB",
      "DevOps:   Docker, Kubernetes, CI/CD, Linux",
      "Security: Web安全, 渗透测试, CTF",
    ],
  },
  {
    cmd: "blog",
    description: "查看博客",
    output: [
      "📚 最新文章",
      "",
      "👉 前往 /blog 查看所有文章",
      "🔍 使用 /search 搜索文章",
      "📂 归档在 /archive",
    ],
  },
  {
    cmd: "contact",
    description: "联系方式",
    output: [
      "📧 联系方式:",
      "",
      "GitHub:   github.com",
      "邮箱:     aston's blog",
      "Bilibili: b站",
    ],
  },
  {
    cmd: "coffee",
    description: "请我喝杯咖啡",
    output: [
      "☕ 感谢你的支持！",
      "",
      "虽然我不能真的喝咖啡...",
      "但你的支持让我很开心！",
      "",
      "💡 你可以:",
      "  - 在博客留言",
      "  - 订阅 RSS",
      "  - Star 我的项目",
    ],
  },
];

const quickLinks = [
  { icon: BookOpen, label: "博客", href: "/blog", color: "text-rose-500" },
  { icon: User, label: "关于", href: "/about", color: "text-emerald-500" },
  { icon: Folder, label: "项目", href: "/projects", color: "text-amber-500" },
  { icon: Heart, label: "友链", href: "/friends", color: "text-pink-500" },
];

export function TerminalBlock() {
  const [history, setHistory] = useState<{ type: "input" | "output"; text: string[] }[]>([
    {
      type: "output",
      text: [
        " Aston's Blog Terminal v1.0.0",
        ' Type "help" for available commands',
        "",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const executeCommand = (cmd: string) => {
    const command = cmd.toLowerCase().trim();
    
    if (command === "clear") {
      setHistory([]);
      return;
    }

    const found = commands.find((c) => c.cmd === command);
    
    setHistory((prev) => [
      ...prev,
      { type: "input", text: [`> ${cmd}`] },
      {
        type: "output",
        text: found ? found.output : [`Command not found: ${cmd}`, 'Type "help" for available commands'],
      },
    ]);
    
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (input.trim()) {
        executeCommand(input);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Terminal */}
      <div className="lg:col-span-2 bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm text-gray-400 ml-2">visitor@aston-blog:~</span>
        </div>

        {/* Terminal content */}
        <div className="p-4 h-[300px] overflow-y-auto font-mono text-sm">
          {history.map((entry, index) => (
            <div key={index} className={entry.type === "input" ? "text-green-400 mt-2" : "text-gray-300 whitespace-pre-wrap"}>
              {entry.text.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ))}
          
          {/* Input line */}
          <div className="flex items-center mt-2">
            <span className="text-green-400 mr-2">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-gray-100 caret-green-400"
              placeholder="输入命令..."
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="space-y-3">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-5 w-5 text-rose-500" />
            <span className="font-bold">快捷入口</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <Icon className={`h-6 w-6 ${link.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{link.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
