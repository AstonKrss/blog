"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Terminal, Send, Sparkles } from "lucide-react";

const commands: Record<string, { output: string; isHtml?: boolean }> = {
  help: { output: `可用命令:
  help          - 显示帮助信息
  about         - 关于博主
  skills        - 技能列表
  contact       - 联系方式
  social        - 社交媒体链接
  projects      - 项目列表
  joke          - 随机笑话
  matrix        - 黑客帝国效果
  clear         - 清屏
  date          - 当前时间
  whoami        - 当前用户
  ls            - 列出文件
  cat resume    - 查看简历
  fortune       - 每日一言` },
  about: { output: `👤 Aston - 佛山大学计算机专业学生
 🎯 专注于 DevSecOps 实践
 💻 热爱技术，喜欢折腾` },
  skills: { output: `⚡ 前端: Next.js, React, TypeScript, Tailwind CSS
 🔧 后端: Spring Boot, Java, MySQL
 🛡️ 安全: CTF, Web安全, 渗透测试
 🐳 DevOps: Docker, Linux, Git` },
  contact: { output: `📧 邮箱: admin@example.com
 🐙 GitHub: github.com/aston
 💬 微信: aston_dev` },
  social: { output: `🐙 GitHub: https://github.com/
 📺 Bilibili: https://www.bilibili.com/
 💬 知乎: https://www.zhihu.com/` },
  projects: { output: `📂 项目列表:
 🌐 个人博客 - Next.js + Spring Boot (你正在看的这个!)
 🔒 安全工具箱 - 在线编码/加密工具
 📝 笔记系统 - Markdown 笔记管理` },
  joke: { output: (() => {
    const jokes = [
      "为什么程序员喜欢黑暗模式？因为光会引来 bug 🐛",
      "一个 SQL 查询走进酒吧，看到两张桌子，然后 JOIN 了它们 🍺",
      "我的代码没有 bug，只有未预期的特性 ✨",
      "世界上只有 10 种人：懂二进制的和不懂的 🤓",
      "程序员最讨厌的两件事：1. 写文档 2. 别人不写文档 📝",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  })() },
  whoami: { output: `> 全栈开发者 | 开源贡献者` },
  date: { output: new Date().toLocaleString("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
  ls: { output: `about.txt  skills.md  contact.json  projects/  resume.md  .secret` },
  "cat resume": { output: `📄 简历摘要

教育背景:
  🎓 佛山大学 - 计算机科学与技术 (2025-至今)

技术栈:
  💻 前端: Next.js, React, TypeScript
  🔧 后端: Spring Boot, Java, MySQL
  🛡️ 安全: CTF, Web安全
  🐳 DevOps: Docker, Linux

项目经验:
  🌐 个人博客系统 (全栈开发)
  🔒 安全工具箱 (前端开发)` },
  fortune: { output: (() => {
    const fortunes = [
      "千里之行，始于足下。—— 老子",
      "学而不思则罔，思而不学则殆。—— 孔子",
      "代码是程序员的诗。",
      "保持饥饿，保持愚蠢。—— Steve Jobs",
      "Talk is cheap. Show me the code. —— Linus Torvalds",
      "任何足够先进的技术都与魔法无异。—— Arthur C. Clarke",
    ];
    return fortunes[Math.floor(Math.random() * fortunes.length)];
  })() },
  skills2: { output: `> react/  nodejs/  rust/  design/` },
  "cat contact.txt": { output: `> 微信: aston_dev (二维码 ASCII 艺术)

   ██╗   ██╗ ██████╗ ██╗██████╗ 
   ╚██╗ ██╔╝██╔═══██╗██║██╔══██╗
    ╚████╔╝ ██║   ██║██║██║  ██║
     ╚██╔╝  ██║   ██║██║██║  ██║
      ██║   ╚██████╔╝██║██████╔╝
      ╚═╝    ╚═════╝ ╚═╝╚═════╝` },
};

let matrixInterval: ReturnType<typeof setInterval> | null = null;

export default function TerminalPage() {
  const [history, setHistory] = useState<{ cmd: string; output: string }[]>([]);
  const [input, setInput] = useState("");
  const [isMatrix, setIsMatrix] = useState(false);
  const [matrixChars, setMatrixChars] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isMatrix) {
      const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
      matrixInterval = setInterval(() => {
        setMatrixChars(Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]));
      }, 100);
    } else {
      if (matrixInterval) clearInterval(matrixInterval);
      setMatrixChars([]);
    }
    return () => { if (matrixInterval) clearInterval(matrixInterval); };
  }, [isMatrix]);

  const executeCommand = () => {
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    if (cmd === "clear") {
      setHistory([]);
      setInput("");
      return;
    }

    if (cmd === "matrix") {
      setIsMatrix(!isMatrix);
      setHistory([...history, { cmd: input, output: isMatrix ? "Matrix 效果已关闭" : "Matrix 效果已开启！再次输入 matrix 关闭" }]);
      setInput("");
      return;
    }

    const cmdResult = commands[cmd];
    const output = cmdResult ? cmdResult.output : `命令未找到: ${cmd}\n输入 'help' 查看可用命令`;
    setHistory([...history, { cmd: input, output }]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") executeCommand();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-green-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
              <Terminal className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-3 text-4xl font-bold">
              <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">终端</span>
            </h1>
            <p className="text-muted-foreground">输入 <code className="bg-muted px-1.5 py-0.5 rounded text-sm">help</code> 查看可用命令</p>
          </div>

          <div className="rounded-2xl border bg-gray-950 shadow-2xl overflow-hidden glow-card">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-gray-500 ml-2">aston@blog ~ %</span>
            </div>

            {/* Matrix Effect */}
            {isMatrix && (
              <div className="p-4 font-mono text-sm text-green-500 overflow-hidden" style={{ maxHeight: "200px" }}>
                <div className="grid grid-cols-10 gap-1 text-center">
                  {matrixChars.map((char, i) => (
                    <span key={i} className="opacity-70" style={{ opacity: Math.random() * 0.7 + 0.3 }}>{char}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Terminal Body */}
            <div className="p-4 font-mono text-sm min-h-[400px] max-h-[500px] overflow-y-auto" onClick={() => inputRef.current?.focus()}>
              {/* Welcome Message */}
              {history.length === 0 && (
                <div className="text-green-400 mb-4">
                  <pre className="text-xs leading-tight mb-4">{`
 ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗
 ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║
    ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║
    ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║
    ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
`}</pre>
                  <p className="text-gray-500">输入 <span className="text-green-400">help</span> 开始探索 ✨</p>
                </div>
              )}

              {/* History */}
              {history.map((entry, i) => (
                <div key={i} className="mb-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="text-gray-500">❯</span>
                    <span>{entry.cmd}</span>
                  </div>
                  <pre className="text-gray-300 whitespace-pre-wrap mt-1 ml-4">{entry.output}</pre>
                </div>
              ))}

              {/* Input */}
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-gray-500">❯</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none outline-none text-gray-300 placeholder-gray-600"
                  placeholder="输入命令..."
                  autoFocus
                />
              </div>
              <div ref={endRef} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
