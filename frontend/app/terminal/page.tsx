"use client"
import { getToken, clearToken } from "@/lib/token"

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { Terminal, BookOpen, TerminalSquare, ChevronRight, Lock, Unlock } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  permissions: string;
  owner: string;
  group: string;
  size: number;
  date: string;
  slug?: string;
  status?: string;
}

interface DirectoryListing {
  path: string;
  entries: FileEntry[];
}

interface FileContent {
  path: string;
  name: string;
  content: string;
  type: string;
  editable: boolean;
  postId?: string;
  status?: string;
}

type VimMode = "NORMAL" | "INSERT" | "COMMAND";

interface VimState {
  mode: VimMode;
  content: string;
  originalContent: string;
  cursorLine: number;
  cursorCol: number;
  commandBuffer: string;
  filePath: string | null;
  fileName: string | null;
  postId: string | null;
  editable: boolean;
  statusMessage: string;
}

interface HistoryEntry {
  input: string;
  output: React.ReactNode;
  isCommand: boolean;
}

export default function TerminalPage() {
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentPath, setCurrentPath] = useState("/home/aston");
  const [isMatrix, setIsMatrix] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Vim state
  const [vimState, setVimState] = useState<VimState>({
    mode: "NORMAL",
    content: "",
    originalContent: "",
    cursorLine: 0,
    cursorCol: 0,
    commandBuffer: "",
    filePath: null,
    fileName: null,
    postId: null,
    editable: false,
    statusMessage: "",
  });
  const [isVimMode, setIsVimMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const vimInputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    setIsEmbedded(window.self !== window.top);
  }, []);

  // Only scroll when user sends a command — not on initial mount.
  // Initial history[] set from useEffect is NOT a command, it's the welcome message.
  const previousHistoryLength = useRef(0);
  useEffect(() => {
    if (history.length > previousHistoryLength.current) {
      scrollToBottom();
      previousHistoryLength.current = history.length;
    }
  }, [history.length, scrollToBottom]);

  useEffect(() => {
    if (isVimMode && vimInputRef.current && !isEmbedded) {
      vimInputRef.current.focus();
    }
  }, [isVimMode, isEmbedded]);

  // Initial welcome message
  useEffect(() => {
    setHistory([
      {
        input: "",
        output: (
          <div className="space-y-4">
            <div className="text-cyan-400 text-xl font-bold flex items-center gap-2">
              <Terminal className="h-6 w-6" /> Aston's DevOps Terminal
            </div>
            <div className="text-gray-400 text-sm">
              🖥️ 交互式 Linux 终端 | 学习 DevOps 技能
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">Docker</span>
              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Linux</span>
              <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Git</span>
              <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">Nginx</span>
            </div>
            <div className="border-b border-gray-700" />
            <div className="text-gray-400 text-sm">
              输入 <span className="text-green-400">help</span> 查看命令 | <span className="text-yellow-400">learn</span> 开始学习
            </div>
            <div className="text-yellow-400 text-sm">
              💡 输入 <span className="text-green-400">login</span> 登录后可使用 vim 编辑文章
            </div>
          </div>
        ),
        isCommand: false,
      },
    ]);
  }, []);

  // Check auth status
  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-focus input after command execution
  useEffect(() => {
    if (!isVimMode && !isLoading && inputRef.current && !isEmbedded) {
      inputRef.current.focus();
    }
  }, [history, isLoading, isVimMode, isEmbedded]);

  const checkAuth = async () => {
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API_BASE}/api/terminal/check-auth`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.code === 0 && data.data.isLoggedIn) {
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error("Auth check failed:", e);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes.toString();
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "K";
    return (bytes / (1024 * 1024)).toFixed(1) + "M";
  };

  const addToHistory = (input: string, output: React.ReactNode) => {
    setHistory((prev) => [...prev, { input, output, isCommand: true }]);
  };

  const addToOutput = (output: React.ReactNode) => {
    setHistory((prev) => [...prev, { input: "", output, isCommand: false }]);
  };

  // API calls
  const fetchDirectory = async (path: string): Promise<DirectoryListing | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/terminal/ls?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.code === 0) {
        return data.data;
      }
    } catch (e) {
      console.error("Fetch directory failed:", e);
    }
    return null;
  };

  const fetchFile = async (path: string): Promise<FileContent | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/terminal/cat?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.code === 0) {
        return data.data;
      }
    } catch (e) {
      console.error("Fetch file failed:", e);
    }
    return null;
  };

  const saveFile = async (path: string, content: string): Promise<boolean> => {
    try {
      const token = getToken();
      if (!token) return false;

      const res = await fetch(`${API_BASE}/api/terminal/write`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path, content }),
      });
      const data = await res.json();
      return data.code === 0;
    } catch (e) {
      console.error("Save file failed:", e);
      return false;
    }
  };

  // Command execution
  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    setCommandHistory((prev) => [...prev, trimmedCmd]);
    setHistoryIndex(-1);
    setIsLoading(true);

    const [command, ...args] = trimmedCmd.split(" ");
    const fullCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;

    // Clear command
    if (trimmedCmd === "clear") {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    // Login command
    if (command === "login" || trimmedCmd.startsWith("login ")) {
      if (isAuthenticated) {
        addToHistory(trimmedCmd, <span className="text-green-400">已登录，可以编辑文件</span>);
        setIsLoading(false);
        return;
      }
      
      // Parse username and password from command
      let username = "";
      let password = "";
      
      if (trimmedCmd.startsWith("login ")) {
        const loginArgs = trimmedCmd.slice(6).trim();
        if (loginArgs.includes(" -p ")) {
          const parts = loginArgs.split(" -p ");
          username = parts[0].trim();
          password = parts[1].trim();
        } else {
          addToHistory(trimmedCmd, <span className="text-yellow-400">用法: login username -p password</span>);
          setIsLoading(false);
          return;
        }
      } else {
        addToHistory(trimmedCmd, <span className="text-yellow-400">用法: login username -p password</span>);
        setIsLoading(false);
        return;
      }
      
      if (!username || !password) {
        addToHistory(trimmedCmd, <span className="text-yellow-400">用法: login username -p password</span>);
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        
        if (data.code === 0 && data.data && data.data.token) {
          localStorage.setItem("token", data.data.token);
          setIsAuthenticated(true);
          addToHistory(trimmedCmd, <span className="text-green-400">登录成功！欢迎 {username}</span>);
        } else {
          addToHistory(trimmedCmd, <span className="text-red-400">登录失败: {data.message || "用户名或密码错误"}</span>);
        }
      } catch (e) {
        addToHistory(trimmedCmd, <span className="text-red-400">登录请求失败，请检查服务器连接</span>);
      }
      setIsLoading(false);
      return;
    }

    // Logout command
    if (trimmedCmd === "logout") {
      clearToken();
      setIsAuthenticated(false);
      addToHistory(trimmedCmd, <span className="text-green-400">已退出登录</span>);
      setIsLoading(false);
      return;
    }

    // Help command
    if (trimmedCmd === "help") {
      addToHistory(
        trimmedCmd,
        <div className="space-y-3">
          <div className="text-cyan-400 font-bold text-lg mb-3">📚 可用命令</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              { cmd: "help", desc: "显示帮助信息" },
              { cmd: "ls [-l]", desc: "列出目录内容" },
              { cmd: "cd <dir>", desc: "切换目录" },
              { cmd: "pwd", desc: "显示当前路径" },
              { cmd: "cat <file>", desc: "查看文件内容" },
              { cmd: "head -n <n> <file>", desc: "显示文件前 n 行" },
              { cmd: "tail -n <n> <file>", desc: "显示文件后 n 行" },
              { cmd: "grep <pat> <file>", desc: "搜索文件内容" },
              { cmd: "wc <file>", desc: "统计行数/词数/字符" },
              { cmd: "vim <file>", desc: "编辑文件 (需登录)" },
              { cmd: "top", desc: "系统监控 (CPU/内存)" },
              { cmd: "ps aux", desc: "进程列表" },
              { cmd: "free [-h]", desc: "内存使用情况" },
              { cmd: "df [-h]", desc: "磁盘使用情况" },
              { cmd: "uptime", desc: "系统运行时间" },
              { cmd: "whoami", desc: "当前用户" },
              { cmd: "date", desc: "当前日期时间" },
              { cmd: "uname -a", desc: "系统信息" },
              { cmd: "neofetch", desc: "系统详细信息" },
              { cmd: "matrix", desc: "黑客帝国效果" },
              { cmd: "clear", desc: "清屏" },
              { cmd: "learn [topic]", desc: "🎓 学习中心 (docker/linux/git/nginx...)" },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex gap-2">
                <span className="text-green-400 font-mono min-w-[180px]">{cmd}</span>
                <span className="text-gray-400">{desc}</span>
              </div>
            ))}
          </div>
          <div className="text-gray-400 text-sm mt-4 border-t border-gray-700 pt-3">
            💡 登录后可以使用 vim 编辑文章 | <span className="text-yellow-400">learn docker/linux/git</span> 学习运维技能
          </div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // PWD command
    if (trimmedCmd === "pwd") {
      addToHistory(trimmedCmd, <span className="text-green-400">{currentPath}</span>);
      setIsLoading(false);
      return;
    }

    // CD command
    if (command === "cd") {
      const target = args[0] || "~";
      let newPath = currentPath;

      // Normalize path handling
      if (target === "~" || target === "/home/aston" || target === "") {
        newPath = "/home/aston";
      } else if (target === "..") {
        if (currentPath !== "/home/aston") {
          const parts = currentPath.split("/").filter(p => p);
          parts.pop();
          newPath = "/" + parts.join("/") || "/home/aston";
        }
      } else if (target === ".") {
        // Stay in current directory
      } else if (target.startsWith("/")) {
        newPath = target;
      } else {
        // Handle relative paths like ./dir or dir
        let cleanTarget = target;
        if (target.startsWith("./")) {
          cleanTarget = target.slice(2);
        }
        if (cleanTarget) {
          newPath = currentPath === "/home/aston" 
            ? `/home/aston/${cleanTarget}` 
            : `${currentPath}/${cleanTarget}`;
        }
      }

      // Normalize path (remove double slashes, resolve . and ..)
      const normalizePath = (p: string): string => {
        const parts = p.split("/").filter(part => part && part !== ".");
        const result: string[] = [];
        for (const part of parts) {
          if (part === "..") {
            result.pop();
          } else {
            result.push(part);
          }
        }
        return "/" + result.join("/") || "/home/aston";
      };
      
      newPath = normalizePath(newPath);

      // Check if directory exists by fetching listing
      const listing = await fetchDirectory(newPath);
      if (listing && (listing.entries.length > 0 || newPath === "/home/aston")) {
        // Also verify it's actually a directory by checking entries
        const isValidDir = listing.entries.some(e => e.type === "directory" && 
          normalizePath(`${newPath}/${e.name}`) === normalizePath(newPath)) || 
          newPath.split("/").filter(Boolean).length <= 3; // root level dirs are always valid
        
        // Additional check: only allow known paths
        const validPaths = ["/home/aston", "/home/aston/articles", "/home/aston/drafts", "/home/aston/projects"];
        if (validPaths.includes(newPath) || listing.entries.length > 0) {
          setCurrentPath(newPath);
          addToHistory(trimmedCmd, null);
        } else {
          addToHistory(trimmedCmd, <span className="text-red-400">cd: {target}: 目录不存在</span>);
        }
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">cd: {target}: 目录不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // LS command
    if (command === "ls") {
      const showLongFormat = args.includes("-l") || args.includes("-la") || args.includes("-al");
      const targetPath = args[0] && !args[0].startsWith("-") ? (args[0].startsWith("/") ? args[0] : `${currentPath}/${args[0]}`) : currentPath;

      const listing = await fetchDirectory(targetPath);
      if (listing) {
        if (showLongFormat) {
          addToHistory(
            trimmedCmd,
            <div className="font-mono text-sm">
              <div className="text-gray-500 mb-1">total {listing.entries.length}</div>
              {listing.entries.map((entry, i) => (
                <div key={i} className={entry.type === "directory" ? "text-blue-400" : "text-gray-300"}>
                  <span className="text-gray-600">{entry.permissions} </span>
                  <span className="text-gray-500 w-8 inline-block">{entry.owner} </span>
                  <span className="text-gray-500 w-8 inline-block">{entry.group} </span>
                  <span className="text-gray-600 w-12 inline-block text-right">{formatFileSize(entry.size)} </span>
                  <span className="text-gray-500 w-12 inline-block">{entry.date} </span>
                  <span>{entry.name}</span>
                  {entry.type === "directory" && <span className="text-blue-400">/</span>}
                </div>
              ))}
            </div>
          );
        } else {
          addToHistory(
            trimmedCmd,
            <div className="font-mono text-sm">
              <div className="flex flex-wrap gap-4">
                {listing.entries.map((entry, i) => (
                  <span key={i} className={entry.type === "directory" ? "text-blue-400" : "text-green-400"}>
                    {entry.name}
                    {entry.type === "directory" && <span className="text-blue-300">/</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        }
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">ls: 无法访问目录</span>);
      }
      setIsLoading(false);
      return;
    }

    // CAT command
    if (command === "cat") {
      const fileName = args[0];
      if (!fileName) {
        addToHistory(trimmedCmd, <span className="text-red-400">cat: 缺少文件参数</span>);
        setIsLoading(false);
        return;
      }

      let filePath = fileName;
      if (!fileName.startsWith("/")) {
        filePath = `${currentPath}/${fileName}`;
      }

      const content = await fetchFile(filePath);
      if (content) {
        addToHistory(
          trimmedCmd,
          <div className="font-mono text-sm whitespace-pre-wrap text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
            {content.content}
          </div>
        );
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">cat: {fileName}: 文件不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // VIM command
    if (command === "vim" || command === "vi") {
      const fileName = args[0];
      if (!fileName) {
        addToHistory(trimmedCmd, <span className="text-red-400">vim: 缺少文件参数</span>);
        setIsLoading(false);
        return;
      }

      let filePath = fileName;
      if (!fileName.startsWith("/")) {
        filePath = `${currentPath}/${fileName}`;
      }

      const content = await fetchFile(filePath);
      if (content) {
        if (content.editable || isAuthenticated) {
          setVimState({
            mode: "NORMAL",
            content: content.content,
            originalContent: content.content,
            cursorLine: 0,
            cursorCol: 0,
            commandBuffer: "",
            filePath,
            fileName: content.name,
            postId: content.postId || null,
            editable: true,
            statusMessage: `"/${content.name}" ${content.content.split("\n").length} lines`,
          });
          setIsVimMode(true);
          addToHistory(trimmedCmd, null);
        } else {
          addToHistory(trimmedCmd, <span className="text-yellow-400">vim: {fileName}: 只读文件 (需要登录才能编辑)</span>);
        }
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">vim: {fileName}: 文件不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // Neofetch
    if (trimmedCmd === "neofetch") {
      addToHistory(
        trimmedCmd,
        <div className="flex gap-8">
          <div className="space-y-2">
            <div className="text-cyan-400 text-xl font-bold">aston@blog-server</div>
            <div className="text-green-400">-----------------</div>
            <div className="text-gray-400 space-y-1 text-sm">
              <div><span className="text-pink-400">OS:</span> Ubuntu 24.04 LTS</div>
              <div><span className="text-pink-400">Host:</span> VPS Server</div>
              <div><span className="text-pink-400">Kernel:</span> 6.8.0-49-generic</div>
              <div><span className="text-pink-400">Uptime:</span> 2 days, 15 hours</div>
              <div><span className="text-pink-400">Shell:</span> vim 9.0</div>
              <div><span className="text-pink-400">Terminal:</span> Web Terminal</div>
            </div>
          </div>
          <div className="space-y-0.5 text-green-400 font-mono text-xs leading-none">
            <div>         .-''''''-. </div>
            <div>       .'          '.</div>
            <div>      /   0      0   \</div>
            <div>     |      ____      |</div>
            <div>      \    /----\    /</div>
            <div>       '..'        '..'</div>
          </div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // Matrix toggle
    if (trimmedCmd === "matrix") {
      setIsMatrix(!isMatrix);
      addToHistory(trimmedCmd, isMatrix ? "Matrix 效果已关闭" : "Matrix 效果已开启!");
      setIsLoading(false);
      return;
    }

    // TOP - System monitor
    if (trimmedCmd === "top" || trimmedCmd.startsWith("top ")) {
      addToHistory(
        trimmedCmd,
        <div className="font-mono text-sm">
          <div className="text-green-400 mb-2">top - 14:32:05 up 2 days, 15:22, 1 user, load average: 0.15, 0.10, 0.08</div>
          <div className="text-gray-500 mb-2">Tasks: 127 total, 1 running, 126 sleeping, 0 stopped, 0 zombie</div>
          <div className="text-gray-500 mb-2">%Cpu(s): 3.2 us, 1.5 sy, 0.0 ni, 95.0 id, 0.2 wa, 0.0 hi, 0.1 si, 0.0 st</div>
          <div className="text-gray-500 mb-3">MiB Mem: 2048.0 total, 512.3 free, 1024.5 used, 511.2 buff/cache</div>
          <div className="text-gray-400 border-t border-gray-700 pt-2">
            <div className="flex mb-1">
              <span className="w-10 text-right text-gray-500 mr-4">PID</span>
              <span className="w-32 text-gray-500">USER</span>
              <span className="w-8 text-right text-gray-500 mr-4">%CPU</span>
              <span className="w-8 text-right text-gray-500 mr-4">%MEM</span>
              <span className="text-gray-500">COMMAND</span>
            </div>
            <div className="flex">
              <span className="w-10 text-right text-green-400 mr-4">1</span>
              <span className="w-32 text-cyan-400">root</span>
              <span className="w-8 text-right mr-4">1.2</span>
              <span className="w-8 text-right mr-4">0.5</span>
              <span>systemd</span>
            </div>
            <div className="flex">
              <span className="w-10 text-right text-green-400 mr-4">234</span>
              <span className="w-32 text-cyan-400">mysql</span>
              <span className="w-8 text-right mr-4">2.8</span>
              <span className="w-8 text-right mr-4">8.2</span>
              <span>mysqld</span>
            </div>
            <div className="flex">
              <span className="w-10 text-right text-green-400 mr-4">567</span>
              <span className="w-32 text-cyan-400">nginx</span>
              <span className="w-8 text-right mr-4">0.5</span>
              <span className="w-8 text-right mr-4">0.3</span>
              <span>nginx: worker</span>
            </div>
            <div className="flex">
              <span className="w-10 text-right text-green-400 mr-4">890</span>
              <span className="w-32 text-cyan-400">aston</span>
              <span className="w-8 text-right mr-4">0.3</span>
              <span className="w-8 text-right mr-4">0.2</span>
              <span>java -jar blog.jar</span>
            </div>
          </div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // PS - Process list
    if (trimmedCmd === "ps" || trimmedCmd === "ps aux") {
      addToHistory(
        trimmedCmd,
        <div className="font-mono text-sm">
          <div className="text-gray-400 border-b border-gray-700 pb-1 mb-2">
            <span className="w-8 text-gray-500">PID</span>
            <span className="w-10 text-gray-500">TTY</span>
            <span className="w-12 text-gray-500">STAT</span>
            <span className="w-12 text-gray-500">TIME</span>
            <span className="text-gray-500">COMMAND</span>
          </div>
          <div className="text-gray-300">
            <div><span className="text-green-400 w-8 inline-block">1</span><span className="w-10">?</span><span className="w-12">Ss</span><span className="w-12">00:02</span><span>/sbin/init</span></div>
            <div><span className="text-green-400 w-8 inline-block">234</span><span className="w-10">?</span><span className="w-12">Ss</span><span className="w-12">00:05</span><span>/usr/sbin/sshd -D</span></div>
            <div><span className="text-green-400 w-8 inline-block">567</span><span className="w-10">?</span><span className="w-12">Ssl</span><span className="w-12">00:12</span><span>nginx: master</span></div>
            <div><span className="text-green-400 w-8 inline-block">568</span><span className="w-10">?</span><span className="w-12">S</span><span className="w-12">00:03</span><span>nginx: worker</span></div>
            <div><span className="text-green-400 w-8 inline-block">890</span><span className="w-10">?</span><span className="w-12">Sl</span><span className="w-12">05:32</span><span>java -jar blog.jar</span></div>
            <div><span className="text-green-400 w-8 inline-block">1234</span><span className="w-10">pts/0</span><span className="w-12">Ss</span><span className="w-12">00:00</span><span>bash</span></div>
          </div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // FREE - Memory info
    if (trimmedCmd === "free" || trimmedCmd.startsWith("free ")) {
      const showHuman = trimmedCmd.includes("-h") || trimmedCmd.includes("--human");
      addToHistory(
        trimmedCmd,
        <div className="font-mono text-sm">
          <div className="text-gray-500 mb-1">              total        used        free      shared  buff/cache   available</div>
          <div className="text-gray-300">
            <div><span className="text-cyan-400 w-10">Mem:</span><span className="mr-4">{showHuman ? "2.0Gi" : "2048"}</span><span className="mr-4 text-yellow-400">{showHuman ? "1.0Gi" : "1024"}</span><span className="mr-4 text-green-400">{showHuman ? "512Mi" : "512"}</span><span className="mr-4">256Mi</span><span className="mr-4">256Mi</span><span className="text-green-400">512Mi</span></div>
            <div><span className="text-cyan-400 w-10">Swap:</span><span className="mr-4 text-gray-500">{showHuman ? "1.0Gi" : "1024"}</span><span className="mr-4 text-gray-500">0</span><span className="mr-4 text-green-400">{showHuman ? "1.0Gi" : "1024"}</span><span className="mr-4 text-gray-500">0</span><span className="mr-4 text-gray-500">0</span><span className="text-green-400">{showHuman ? "1.0Gi" : "1024"}</span></div>
          </div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // DF - Disk usage
    if (trimmedCmd === "df" || trimmedCmd.includes("-h")) {
      addToHistory(
        trimmedCmd,
        <div className="font-mono text-sm">
          <div className="text-gray-500 mb-1">Filesystem      Size  Used Avail Use% Mounted on</div>
          <div className="text-gray-300 space-y-1">
            <div><span>/dev/sda1</span><span className="ml-4 mr-4 text-cyan-400">50G</span><span className="mr-4 text-yellow-400">20G</span><span className="mr-4 text-green-400">28G</span><span className="mr-4">42%</span><span>/</span></div>
            <div><span>/dev/sda2</span><span className="ml-4 mr-4 text-cyan-400">100G</span><span className="mr-4 text-yellow-400">45G</span><span className="mr-4 text-green-400">55G</span><span className="mr-4">45%</span><span>/home</span></div>
            <div><span>tmpfs</span><span className="ml-4 mr-4 text-cyan-400">2.0G</span><span className="mr-4 text-gray-500">0</span><span className="mr-4 text-green-400">2.0G</span><span className="mr-4">0%</span><span>/dev/shm</span></div>
          </div>
        </div>
      );
      setIsLoading(false);
      return;
    }

    // UPTIME - System uptime
    if (trimmedCmd === "uptime") {
      addToHistory(
        trimmedCmd,
        <span className="text-green-400">14:32:05 up 2 days, 15:22, 1 user, load average: 0.15, 0.10, 0.08</span>
      );
      setIsLoading(false);
      return;
    }

    // HEAD - Show first lines of file
    if (command === "head") {
      const lines = args.find(a => !a.startsWith("-")) ? parseInt(args.find(a => !a.startsWith("-")) || "10") : 10;
      const fileName = args.find(a => !a.startsWith("-")) || args[1];
      
      if (!fileName) {
        addToHistory(trimmedCmd, <span className="text-red-400">head: 缺少文件参数</span>);
        setIsLoading(false);
        return;
      }

      let filePath = fileName;
      if (!fileName.startsWith("/")) {
        filePath = `${currentPath}/${fileName}`;
      }

      const content = await fetchFile(filePath);
      if (content) {
        const fileLines = content.content.split("\n").slice(0, lines);
        addToHistory(
          trimmedCmd,
          <div className="font-mono text-sm whitespace-pre-wrap text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            {fileLines.join("\n")}
          </div>
        );
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">head: {fileName}: 文件不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // TAIL - Show last lines of file
    if (command === "tail") {
      const lines = args.find(a => !a.startsWith("-")) ? parseInt(args.find(a => !a.startsWith("-")) || "10") : 10;
      const fileName = args.find(a => !a.startsWith("-")) || args[1];
      
      if (!fileName) {
        addToHistory(trimmedCmd, <span className="text-red-400">tail: 缺少文件参数</span>);
        setIsLoading(false);
        return;
      }

      let filePath = fileName;
      if (!fileName.startsWith("/")) {
        filePath = `${currentPath}/${fileName}`;
      }

      const content = await fetchFile(filePath);
      if (content) {
        const fileLines = content.content.split("\n").slice(-lines);
        addToHistory(
          trimmedCmd,
          <div className="font-mono text-sm whitespace-pre-wrap text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            {fileLines.join("\n")}
          </div>
        );
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">tail: {fileName}: 文件不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // GREP - Search in file
    if (command === "grep") {
      let pattern = "";
      let fileName = "";
      let caseInsensitive = false;

      // Parse grep options
      const remainingArgs: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "-i" || args[i] === "--ignore-case") {
          caseInsensitive = true;
        } else if (!args[i].startsWith("-")) {
          remainingArgs.push(args[i]);
        }
      }

      if (remainingArgs.length >= 2) {
        pattern = remainingArgs[0];
        fileName = remainingArgs[1];
      } else if (remainingArgs.length === 1) {
        // If only one arg, it could be pattern with stdin or pattern only
        pattern = remainingArgs[0];
        addToHistory(trimmedCmd, <span className="text-yellow-400">grep: 请指定文件: grep &lt;pattern&gt; &lt;file&gt;</span>);
        setIsLoading(false);
        return;
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">grep: 缺少参数</span>);
        setIsLoading(false);
        return;
      }

      let filePath = fileName;
      if (!fileName.startsWith("/")) {
        filePath = `${currentPath}/${fileName}`;
      }

      const content = await fetchFile(filePath);
      if (content) {
        const lines = content.content.split("\n");
        const matches = lines.filter((line, idx) => {
          const regex = new RegExp(pattern, caseInsensitive ? "i" : "");
          return regex.test(line);
        });

        if (matches.length > 0) {
          addToHistory(
            trimmedCmd,
            <div className="font-mono text-sm whitespace-pre-wrap text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              {matches.map((line, i) => (
                <div key={i}>
                  <span className="text-green-400">{line}</span>
                </div>
              ))}
            </div>
          );
        } else {
          addToHistory(trimmedCmd, <span className="text-gray-400">（无匹配结果）</span>);
        }
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">grep: {fileName}: 文件不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // WC - Word count
    if (command === "wc") {
      const fileName = args[0];
      
      if (!fileName) {
        addToHistory(trimmedCmd, <span className="text-red-400">wc: 缺少文件参数</span>);
        setIsLoading(false);
        return;
      }

      let filePath = fileName;
      if (!fileName.startsWith("/")) {
        filePath = `${currentPath}/${fileName}`;
      }

      const content = await fetchFile(filePath);
      if (content) {
        const lines = content.content.split("\n").length;
        const words = content.content.split(/\s+/).filter(w => w.length > 0).length;
        const chars = content.content.length;
        addToHistory(
          trimmedCmd,
          <span className="text-gray-300 font-mono">
            <span className="text-cyan-400">{lines}</span>
            <span className="text-green-400 ml-4">{words}</span>
            <span className="text-yellow-400 ml-4">{chars}</span>
            <span className="ml-4">{fileName}</span>
          </span>
        );
      } else {
        addToHistory(trimmedCmd, <span className="text-red-400">wc: {fileName}: 文件不存在</span>);
      }
      setIsLoading(false);
      return;
    }

    // WHOAMI
    if (trimmedCmd === "whoami") {
      addToHistory(trimmedCmd, <span className="text-cyan-400">aston</span>);
      setIsLoading(false);
      return;
    }

    // DATE
    if (trimmedCmd === "date") {
      const now = new Date();
      addToHistory(trimmedCmd, <span className="text-yellow-400">{now.toString()}</span>);
      setIsLoading(false);
      return;
    }

    // UNAME
    if (trimmedCmd === "uname" || trimmedCmd === "uname -a") {
      addToHistory(trimmedCmd, <span className="text-green-400">Linux blog-server 6.8.0-49-generic #1 SMP x86_64 GNU/Linux</span>);
      setIsLoading(false);
      return;
    }

    // CLEAR (alias)
    if (trimmedCmd === "cls") {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    // LEARN command
    if (command === "learn") {
      const topic = args[0]?.toLowerCase();
      
      if (!topic) {
        addToHistory(trimmedCmd, (
          <div className="space-y-4">
            <div className="text-cyan-400 font-bold text-lg">🎓 学习中心</div>
            <div className="text-gray-400">选择一个主题开始学习：</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {[
                { cmd: "learn docker", desc: "🐳 容器化技术", icon: "🐳" },
                { cmd: "learn linux", desc: "🐧 Linux 命令行", icon: "🐧" },
                { cmd: "learn git", desc: "📦 Git 版本控制", icon: "📦" },
                { cmd: "learn nginx", desc: "🌐 Nginx Web服务器", icon: "🌐" },
                { cmd: "learn dockerfile", desc: "📝 Dockerfile 编写", icon: "📝" },
                { cmd: "learn dockercompose", desc: "🔗 Docker Compose", icon: "🔗" },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-center gap-2">
                  <span className="text-green-400 font-mono w-44">{cmd}</span>
                  <span className="text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
            <div className="text-yellow-400 text-sm mt-4">💡 输入 <span className="text-green-400">learn &lt;topic&gt;</span> 开始学习，例如: <span className="text-green-400">learn docker</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Docker content
      if (topic === "docker") {
        addToHistory(trimmedCmd, (
          <div className="space-y-4 text-sm">
            <div className="text-cyan-400 font-bold text-lg">🐳 Docker 容器化</div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">1. 什么是 Docker？</div>
              <div className="text-gray-400 mt-1">Docker 是一个开源的容器化平台，让开发者可以打包应用及其依赖到一个可移植的容器中。</div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">2. 核心概念</div>
              <div className="text-gray-400 mt-1 space-y-1">
                <div>• <span className="text-yellow-400">镜像 (Image)</span> - 应用程序的模板，只读的</div>
                <div>• <span className="text-yellow-400">容器 (Container)</span> - 镜像的运行实例</div>
                <div>• <span className="text-yellow-400">仓库 (Registry)</span> - 存储和分发镜像的地方</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">3. 常用命令</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 拉取镜像</span></div>
                <div>docker pull nginx</div>
                <div><span className="text-blue-400"># 运行容器</span></div>
                <div>docker run -d -p 80:80 nginx</div>
                <div><span className="text-blue-400"># 查看运行中的容器</span></div>
                <div>docker ps</div>
                <div><span className="text-blue-400"># 查看所有容器</span></div>
                <div>docker ps -a</div>
                <div><span className="text-blue-400"># 停止容器</span></div>
                <div>docker stop &lt;container_id&gt;</div>
                <div><span className="text-blue-400"># 删除容器</span></div>
                <div>docker rm &lt;container_id&gt;</div>
                <div><span className="text-blue-400"># 查看镜像列表</span></div>
                <div>docker images</div>
              </div>
            </div>
            <div className="text-yellow-400 text-sm mt-4">💡 继续学习: <span className="text-green-400">learn dockerfile</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Dockerfile content
      if (topic === "dockerfile") {
        addToHistory(trimmedCmd, (
          <div className="space-y-4 text-sm">
            <div className="text-cyan-400 font-bold text-lg">📝 Dockerfile 编写指南</div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">1. 基础结构</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-pink-400">FROM</span> openjdk:21-jdk-alpine</div>
                <div><span className="text-pink-400">WORKDIR</span> /app</div>
                <div><span className="text-pink-400">COPY</span> target/*.jar app.jar</div>
                <div><span className="text-pink-400">EXPOSE</span> 8080</div>
                <div><span className="text-pink-400">ENTRYPOINT</span> ["java", "-jar", "app.jar"]</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">2. 常用指令</div>
              <div className="text-gray-400 mt-1 space-y-1">
                <div>• <span className="text-pink-400">FROM</span> - 指定基础镜像</div>
                <div>• <span className="text-pink-400">RUN</span> - 执行命令 (构建时)</div>
                <div>• <span className="text-pink-400">COPY</span> - 复制文件到容器</div>
                <div>• <span className="text-pink-400">CMD</span> - 容器启动命令</div>
                <div>• <span className="text-pink-400">ENV</span> - 设置环境变量</div>
                <div>• <span className="text-pink-400">EXPOSE</span> - 声明端口</div>
                <div>• <span className="text-pink-400">WORKDIR</span> - 设置工作目录</div>
              </div>
            </div>
            <div className="text-yellow-400 text-sm">💡 继续学习: <span className="text-green-400">learn dockercompose</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Docker Compose content
      if (topic === "dockercompose") {
        addToHistory(trimmedCmd, (
          <div className="space-y-4 text-sm">
            <div className="text-cyan-400 font-bold text-lg">🔗 Docker Compose</div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">1. 什么是 Docker Compose？</div>
              <div className="text-gray-400 mt-1">用于定义和运行多容器 Docker 应用的工具，通过 YAML 文件配置应用服务。</div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">2. compose.yaml 示例</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-pink-400">services</span>:</div>
                <div>&nbsp;&nbsp;<span className="text-blue-400">web</span>:</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">image</span>: nginx</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">ports</span>:</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- "80:80"</div>
                <div>&nbsp;&nbsp;<span className="text-blue-400">db</span>:</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">image</span>: mysql:8</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-pink-400">environment</span>:</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MYSQL_ROOT_PASSWORD: secret</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">3. 常用命令</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 启动所有服务</span></div>
                <div>docker compose up -d</div>
                <div><span className="text-blue-400"># 停止所有服务</span></div>
                <div>docker compose down</div>
                <div><span className="text-blue-400"># 查看日志</span></div>
                <div>docker compose logs -f</div>
                <div><span className="text-blue-400"># 重新构建</span></div>
                <div>docker compose up -d --build</div>
              </div>
            </div>
            <div className="text-yellow-400 text-sm">💡 返回学习中心: <span className="text-green-400">learn</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Linux content
      if (topic === "linux") {
        addToHistory(trimmedCmd, (
          <div className="space-y-4 text-sm">
            <div className="text-cyan-400 font-bold text-lg">🐧 Linux 命令行</div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">1. 文件操作</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 列出文件</span></div>
                <div>ls -la</div>
                <div><span className="text-blue-400"># 切换目录</span></div>
                <div>cd /path/to/dir</div>
                <div><span className="text-blue-400"># 创建目录</span></div>
                <div>mkdir dirname</div>
                <div><span className="text-blue-400"># 删除文件</span></div>
                <div>rm file.txt</div>
                <div><span className="text-blue-400"># 删除目录</span></div>
                <div>rm -rf dirname</div>
                <div><span className="text-blue-400"># 复制文件</span></div>
                <div>cp source dest</div>
                <div><span className="text-blue-400"># 移动文件</span></div>
                <div>mv source dest</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">2. 文本处理</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 查看文件</span></div>
                <div>cat file.txt</div>
                <div><span className="text-blue-400"># 查找内容</span></div>
                <div>grep "pattern" file.txt</div>
                <div><span className="text-blue-400"># 统计行数</span></div>
                <div>wc -l file.txt</div>
                <div><span className="text-blue-400"># 排序</span></div>
                <div>sort file.txt</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">3. 系统命令</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 查看进程</span></div>
                <div>ps aux | grep nginx</div>
                <div><span className="text-blue-400"># 杀死进程</span></div>
                <div>kill -9 &lt;pid&gt;</div>
                <div><span className="text-blue-400"># 查看内存</span></div>
                <div>free -h</div>
                <div><span className="text-blue-400"># 查看磁盘</span></div>
                <div>df -h</div>
                <div><span className="text-blue-400"># 查看网络</span></div>
                <div>netstat -tlnp</div>
              </div>
            </div>
            <div className="text-yellow-400 text-sm">💡 返回学习中心: <span className="text-green-400">learn</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Git content
      if (topic === "git") {
        addToHistory(trimmedCmd, (
          <div className="space-y-4 text-sm">
            <div className="text-cyan-400 font-bold text-lg">📦 Git 版本控制</div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">1. 基础配置</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 设置用户名</span></div>
                <div>git config --global user.name "Your Name"</div>
                <div><span className="text-blue-400"># 设置邮箱</span></div>
                <div>git config --global user.email "you@example.com"</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">2. 日常工作流</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 初始化仓库</span></div>
                <div>git init</div>
                <div><span className="text-blue-400"># 克隆仓库</span></div>
                <div>git clone &lt;url&gt;</div>
                <div><span className="text-blue-400"># 添加文件到暂存区</span></div>
                <div>git add .</div>
                <div><span className="text-blue-400"># 提交到本地仓库</span></div>
                <div>git commit -m "commit message"</div>
                <div><span className="text-blue-400"># 推送到远程</span></div>
                <div>git push origin main</div>
                <div><span className="text-blue-400"># 从远程拉取</span></div>
                <div>git pull origin main</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">3. 分支管理</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 查看分支</span></div>
                <div>git branch</div>
                <div><span className="text-blue-400"># 创建分支</span></div>
                <div>git branch feature-name</div>
                <div><span className="text-blue-400"># 切换分支</span></div>
                <div>git checkout feature-name</div>
                <div><span className="text-blue-400"># 创建并切换</span></div>
                <div>git checkout -b feature-name</div>
                <div><span className="text-blue-400"># 合并分支</span></div>
                <div>git merge feature-name</div>
                <div><span className="text-blue-400"># 删除分支</span></div>
                <div>git branch -d feature-name</div>
              </div>
            </div>
            <div className="text-yellow-400 text-sm">💡 返回学习中心: <span className="text-green-400">learn</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Nginx content
      if (topic === "nginx") {
        addToHistory(trimmedCmd, (
          <div className="space-y-4 text-sm">
            <div className="text-cyan-400 font-bold text-lg">🌐 Nginx Web 服务器</div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">1. 基本概念</div>
              <div className="text-gray-400 mt-1">Nginx 是一个高性能的 HTTP 服务器和反向代理服务器。</div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">2. nginx.conf 示例</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-pink-400">server</span> {'{'}</div>
                <div>&nbsp;&nbsp;<span className="text-blue-400">listen</span> 80;</div>
                <div>&nbsp;&nbsp;<span className="text-blue-400">server_name</span> example.com;</div>
                <div>&nbsp;&nbsp;<span className="text-blue-400">location</span> / {'{'}</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">root</span> /var/www/html;</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">index</span> index.html;</div>
                <div>&nbsp;&nbsp;{'}'}</div>
                <div>&nbsp;&nbsp;<span className="text-blue-400">location</span> /api {'{'}</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">proxy_pass</span> http://localhost:8080;</div>
                <div>&nbsp;&nbsp;{'}'}</div>
                <div>{'}'}</div>
              </div>
            </div>
            <div className="border-b border-gray-700 pb-2 mb-2">
              <div className="text-green-400 font-bold">3. 常用命令</div>
              <div className="text-gray-300 font-mono mt-2 space-y-1 bg-black/30 p-3 rounded">
                <div><span className="text-blue-400"># 测试配置</span></div>
                <div>nginx -t</div>
                <div><span className="text-blue-400"># 启动 Nginx</span></div>
                <div>nginx</div>
                <div><span className="text-blue-400"># 重载配置</span></div>
                <div>nginx -s reload</div>
                <div><span className="text-blue-400"># 停止</span></div>
                <div>nginx -s stop</div>
              </div>
            </div>
            <div className="text-yellow-400 text-sm">💡 返回学习中心: <span className="text-green-400">learn</span></div>
          </div>
        ));
        setIsLoading(false);
        return;
      }

      // Unknown topic
      addToHistory(trimmedCmd, (
        <div className="space-y-2">
          <div className="text-red-400">❌ 未知主题: {topic}</div>
          <div className="text-gray-400">可用主题: <span className="text-green-400">docker, linux, git, nginx, dockerfile, dockercompose</span></div>
          <div className="text-yellow-400">💡 输入 <span className="text-green-400">learn</span> 查看所有主题</div>
        </div>
      ));
      setIsLoading(false);
      return;
    }

    // Unknown command
    addToHistory(trimmedCmd, <span className="text-red-400">{command}: command not found. Type 'help' for available commands.</span>);
    setIsLoading(false);
  };

  // Vim key handler
  const handleVimKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { mode, commandBuffer, content } = vimState;

    if (mode === "NORMAL") {
      switch (e.key) {
        case "i":
          e.preventDefault();
          setVimState((prev) => ({ ...prev, mode: "INSERT", statusMessage: "-- INSERT --" }));
          break;
        case "a":
          e.preventDefault();
          setVimState((prev) => ({ ...prev, mode: "INSERT", cursorCol: prev.cursorCol + 1, statusMessage: "-- INSERT --" }));
          break;
        case "A":
          e.preventDefault();
          setVimState((prev) => {
            const lineContent = prev.content.split("\n")[prev.cursorLine] || "";
            return { ...prev, mode: "INSERT", cursorCol: lineContent.length, statusMessage: "-- INSERT --" };
          });
          break;
        case "o":
          e.preventDefault();
          setVimState((prev) => {
            const lines = prev.content.split("\n");
            lines.splice(prev.cursorLine + 1, 0, "");
            const newContent = lines.join("\n");
            return { ...prev, mode: "INSERT", content: newContent, cursorLine: prev.cursorLine + 1, cursorCol: 0, statusMessage: "-- INSERT --" };
          });
          break;
        case "O":
          e.preventDefault();
          setVimState((prev) => {
            const lines = prev.content.split("\n");
            lines.splice(prev.cursorLine, 0, "");
            const newContent = lines.join("\n");
            return { ...prev, mode: "INSERT", content: newContent, cursorLine: prev.cursorLine, cursorCol: 0, statusMessage: "-- INSERT --" };
          });
          break;
        case ":":
          e.preventDefault();
          setVimState((prev) => ({ ...prev, mode: "COMMAND", commandBuffer: ":" }));
          break;
        case "Escape":
          e.preventDefault();
          break;
        case "h":
        case "ArrowLeft":
          e.preventDefault();
          setVimState((prev) => ({ ...prev, cursorCol: Math.max(0, prev.cursorCol - 1) }));
          break;
        case "l":
        case "ArrowRight":
          e.preventDefault();
          const lineLen = (vimState.content.split("\n")[vimState.cursorLine] || "").length;
          setVimState((prev) => ({ ...prev, cursorCol: Math.min(lineLen, prev.cursorCol + 1) }));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setVimState((prev) => ({ ...prev, cursorLine: Math.max(0, prev.cursorLine - 1) }));
          break;
        case "j":
        case "ArrowDown":
          e.preventDefault();
          const totalLines = vimState.content.split("\n").length;
          setVimState((prev) => ({ ...prev, cursorLine: Math.min(totalLines - 1, prev.cursorLine + 1) }));
          break;
        case "w":
          e.preventDefault();
          addToOutput(<span className="text-yellow-400">按 :wq 保存退出, :q! 强制退出</span>);
          break;
      }
    } else if (mode === "INSERT") {
      if (e.key === "Escape") {
        e.preventDefault();
        setVimState((prev) => ({ ...prev, mode: "NORMAL", statusMessage: `"/${prev.fileName}" ${prev.content.split("\n").length} lines` }));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setVimState((prev) => {
          const lines = prev.content.split("\n");
          const currentLine = lines[prev.cursorLine];
          if (prev.cursorCol > 0) {
            lines[prev.cursorLine] = currentLine.slice(0, prev.cursorCol - 1) + currentLine.slice(prev.cursorCol);
            return { ...prev, content: lines.join("\n"), cursorCol: prev.cursorCol - 1 };
          } else if (prev.cursorLine > 0) {
            const prevLine = lines[prev.cursorLine - 1];
            lines.splice(prev.cursorLine, 1);
            return { ...prev, content: lines.join("\n"), cursorLine: prev.cursorLine - 1, cursorCol: prevLine.length };
          }
          return prev;
        });
      } else if (e.key.length === 1) {
        e.preventDefault();
        setVimState((prev) => {
          const lines = prev.content.split("\n");
          const currentLine = lines[prev.cursorLine];
          lines[prev.cursorLine] = currentLine.slice(0, prev.cursorCol) + e.key + currentLine.slice(prev.cursorCol);
          return { ...prev, content: lines.join("\n"), cursorCol: prev.cursorCol + 1 };
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        setVimState((prev) => {
          const lines = prev.content.split("\n");
          const currentLine = lines[prev.cursorLine];
          const before = currentLine.slice(0, prev.cursorCol);
          const after = currentLine.slice(prev.cursorCol);
          lines[prev.cursorLine] = before;
          lines.splice(prev.cursorLine + 1, 0, after);
          return { ...prev, content: lines.join("\n"), cursorLine: prev.cursorLine + 1, cursorCol: 0 };
        });
      }
    } else if (mode === "COMMAND") {
      if (e.key === "Escape") {
        e.preventDefault();
        setVimState((prev) => ({ ...prev, mode: "NORMAL", commandBuffer: "", statusMessage: `"/${prev.fileName}" ${prev.content.split("\n").length} lines` }));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (commandBuffer.length > 1) {
          setVimState((prev) => ({ ...prev, commandBuffer: prev.commandBuffer.slice(0, -1) }));
        } else {
          setVimState((prev) => ({ ...prev, mode: "NORMAL", commandBuffer: "", statusMessage: `"/${prev.fileName}" ${prev.content.split("\n").length} lines` }));
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleVimCommand(commandBuffer);
      } else if (e.key.length === 1) {
        e.preventDefault();
        setVimState((prev) => ({ ...prev, commandBuffer: prev.commandBuffer + e.key }));
      }
    }
  };

  const handleVimCommand = async (cmd: string) => {
    const command = cmd.toLowerCase();

    if (command === ":wq" || command === ":x" || command === "zz") {
      if (vimState.content !== vimState.originalContent) {
        const success = await saveFile(vimState.filePath!, vimState.content);
        if (success) {
          addToOutput(<span className="text-green-400">"/{vimState.fileName}" {vimState.content.split("\n").length}L, {vimState.content.length}C written</span>);
        } else {
          addToOutput(<span className="text-red-400">Error: 保存失败，请确保已登录</span>);
        }
      }
      setIsVimMode(false);
      setVimState({
        mode: "NORMAL", content: "", originalContent: "", cursorLine: 0, cursorCol: 0,
        commandBuffer: "", filePath: null, fileName: null, postId: null, editable: false, statusMessage: "",
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (command === ":q!") {
      setIsVimMode(false);
      addToOutput(<span className="text-yellow-400">放弃修改</span>);
      setVimState({
        mode: "NORMAL", content: "", originalContent: "", cursorLine: 0, cursorCol: 0,
        commandBuffer: "", filePath: null, fileName: null, postId: null, editable: false, statusMessage: "",
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (command === ":q") {
      if (vimState.content !== vimState.originalContent) {
        addToOutput(<span className="text-red-400">E37: No write since last change (add ! to override)</span>);
        setVimState((prev) => ({ ...prev, mode: "NORMAL", commandBuffer: "" }));
      } else {
        setIsVimMode(false);
        setVimState({
          mode: "NORMAL", content: "", originalContent: "", cursorLine: 0, cursorCol: 0,
          commandBuffer: "", filePath: null, fileName: null, postId: null, editable: false, statusMessage: "",
        });
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } else if (command === ":w") {
      const success = await saveFile(vimState.filePath!, vimState.content);
      if (success) {
        addToOutput(<span className="text-green-400">"/{vimState.fileName}" {vimState.content.split("\n").length}L written</span>);
        setVimState((prev) => ({ ...prev, originalContent: prev.content }));
      } else {
        addToOutput(<span className="text-red-400">Error: 保存失败，请确保已登录</span>);
      }
      setVimState((prev) => ({ ...prev, mode: "NORMAL", commandBuffer: "", statusMessage: `"/${prev.fileName}" ${prev.content.split("\n").length} lines` }));
    } else if (command.startsWith(":w ")) {
      addToOutput(<span className="text-yellow-400">不支持的文件名，只支持当前文件</span>);
      setVimState((prev) => ({ ...prev, mode: "NORMAL", commandBuffer: "" }));
    } else {
      addToOutput(<span className="text-red-400">E492: Not an editor command: {cmd}</span>);
      setVimState((prev) => ({ ...prev, mode: "NORMAL", commandBuffer: "" }));
    }
  };

  // Normal input key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isEmbedded && <Header />}
      <main className={`flex-1 relative overflow-hidden ${isEmbedded ? '!py-0' : ''}`}>
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,136,.02)_25%,rgba(0,255,136,.02)_26%,transparent_27%,transparent_74%,rgba(0,255,136,.02)_75%,rgba(0,255,136,.02)_76%,transparent_77%)] bg-[length:50px_50px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-8">
          {/* Terminal */}
          <div className="rounded-2xl border border-green-500/30 overflow-hidden shadow-2xl shadow-green-500/10">
            {/* Terminal Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {isVimMode ? `vim ${vimState.fileName || ""}` : `aston@blog-server:${currentPath.replace("/home/aston", "~")}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Unlock className="h-3 w-3" /> 已登录
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Lock className="h-3 w-3" /> 未登录
                  </span>
                )}
                {isVimMode && (
                  <span className={`text-xs px-2 py-0.5 rounded ${vimState.mode === "INSERT" ? "bg-green-500/30 text-green-400" : "bg-yellow-500/30 text-yellow-400"}`}>
                    {vimState.mode}
                  </span>
                )}
              </div>
            </div>

            {/* Terminal Content */}
            {isVimMode ? (
              /* Vim Editor */
              <div
                className="relative h-[600px] bg-black overflow-hidden font-mono text-sm"
                onClick={() => vimInputRef.current?.focus()}
              >
                {/* Status line */}
                <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-b border-gray-700">
                  <span className="text-gray-400">
                    "{vimState.fileName}" {vimState.content.split("\n").length} lines
                  </span>
                  <span className="text-gray-500">{vimState.statusMessage}</span>
                </div>

                {/* Editor content - use textarea in INSERT mode, display div in NORMAL mode */}
                <div className="h-[calc(100%-60px)] overflow-auto p-4">
                  {vimState.mode === "INSERT" ? (
                    <textarea
                      ref={vimInputRef}
                      value={vimState.content}
                      onChange={(e) => setVimState((prev) => ({ ...prev, content: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setVimState((prev) => ({ 
                            ...prev, 
                            mode: "NORMAL", 
                            statusMessage: `"/${prev.fileName}" ${prev.content.split("\n").length} lines` 
                          }));
                        }
                      }}
                      className="w-full h-full bg-transparent text-green-400 outline-none resize-none whitespace-pre"
                      spellCheck={false}
                      autoFocus
                    />
                  ) : (
                    <div className="whitespace-pre text-green-400 cursor-pointer" onClick={() => {
                      setVimState((prev) => ({ ...prev, mode: "INSERT", statusMessage: "-- INSERT --" }));
                      setTimeout(() => vimInputRef.current?.focus(), 0);
                    }}>
                      {vimState.content}
                    </div>
                  )}
                </div>

                {/* Command line */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-1 bg-gray-800 border-t border-gray-700">
                  {vimState.mode === "COMMAND" ? (
                    <span className="text-yellow-400">{vimState.commandBuffer}</span>
                  ) : (
                    <span className="text-gray-500">
                      {vimState.mode === "INSERT" ? "-- INSERT --" : "按 i 进入编辑, : 进入命令, 点击内容直接编辑"}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Normal Terminal */
              <div
                ref={terminalRef}
                className="relative h-[600px] overflow-y-auto bg-black/90 p-4 font-mono text-sm"
                onClick={() => inputRef.current?.focus()}
              >
                {/* Matrix Effect */}
                {isMatrix && (
                  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className="text-green-400 font-mono text-xs animate-pulse leading-none">
                      <div>10110101 01001010 11010101 00101010 10110101</div>
                      <div>01011010 10100101 01010110 11010010 01011010</div>
                      <div className="text-cyan-400 my-2 text-center text-lg">SYSTEM HACKED</div>
                      <div>11010101 00101010 10110101 01001101 11010101</div>
                    </div>
                  </div>
                )}

                {/* Scanline */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-b from-transparent via-green-500/5 to-transparent bg-[length:100%_4px]" />

                {history.map((entry, index) => (
                  <div key={index} className="mb-4">
                    {entry.isCommand && entry.input && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-cyan-400">aston</span>
                        <span className="text-gray-600">@</span>
                        <span className="text-green-400">blog-server</span>
                        <span className="text-gray-600">:</span>
                        <span className="text-blue-400">{currentPath.replace("/home/aston", "~")}</span>
                        <span className="text-gray-600">$</span>
                        <span className="text-green-400">{entry.input}</span>
                      </div>
                    )}
                    {entry.output && <div>{entry.output}</div>}
                  </div>
                ))}

                {/* Input */}
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">aston</span>
                  <span className="text-gray-600">@</span>
                  <span className="text-green-400">blog-server</span>
                  <span className="text-gray-600">:</span>
                  <span className="text-blue-400">{currentPath.replace("/home/aston", "~")}</span>
                  <span className="text-gray-600">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none text-green-400 caret-green-400"
                    autoFocus
                    spellCheck={false}
                    disabled={isLoading}
                  />
                  <span className="w-2 h-5 bg-green-400 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {isEmbedded && (
            <div className="text-center mb-4">
              <Link href="/terminal" className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors">
                <Terminal className="h-4 w-4" />
                打开完整终端页面 →
              </Link>
            </div>
          )}

          {/* Quick Commands */}
          {!isEmbedded && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { cmd: "help", label: "帮助" },
                { cmd: "ls -l", label: "ls -l" },
                { cmd: "cd articles", label: "文章目录" },
                { cmd: "cat about.md", label: "关于我" },
              ].map(({ cmd, label }) => (
                <button
                  key={cmd}
                  onClick={() => {
                    setInput(cmd);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/50 hover:bg-gray-800/50 hover:border-green-500/50 transition-all text-sm group"
                >
                  <span className="text-gray-300 group-hover:text-white">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Features */}
          {!isEmbedded && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-green-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">真实文件浏览</h3>
                </div>
                <p className="text-sm text-gray-400">使用 ls/cd/cat 浏览真实的文章内容，就像在本地文件系统一样</p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">vim 编辑器</h3>
                </div>
                <p className="text-sm text-gray-400">完整的 vim 操作体验：Normal/Insert/Command 模式切换</p>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-pink-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">权限控制</h3>
                </div>
                <p className="text-sm text-gray-400">登录后可编辑草稿和文章，安全的权限管理系统</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
