"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Shield, Code, Globe, Lock, Hash, Search, Zap, ExternalLink, ArrowLeft } from "lucide-react";

type Tool = { name: string; desc: string; action: string } | { name: string; desc: string; url: string };

const toolCategories: { name: string; icon: any; gradient: string; tools: Tool[] }[] = [
  { name: "编码解码", icon: Code, gradient: "from-blue-500 to-cyan-500", tools: [
    { name: "Base64 编码", desc: "Base64 编码/解码", action: "base64" },
    { name: "URL 编码", desc: "URL 编码/解码", action: "url" },
    { name: "HTML 实体", desc: "HTML 实体编码/解码", action: "html" },
    { name: "Unicode 编码", desc: "Unicode 编码/解码", action: "unicode" },
    { name: "Hex 编码", desc: "Hex 编码/解码", action: "hex" },
    { name: "JWT 解析", desc: "解析 JWT Token", action: "jwt" },
  ]},
  { name: "哈希计算", icon: Hash, gradient: "from-emerald-500 to-teal-500", tools: [
    { name: "MD5 哈希", desc: "计算 MD5 哈希值", action: "md5" },
    { name: "SHA-1 哈希", desc: "计算 SHA-1 哈希值", action: "sha1" },
    { name: "SHA-256 哈希", desc: "计算 SHA-256 哈希值", action: "sha256" },
    { name: "CRC32", desc: "计算 CRC32 校验值", action: "crc32" },
  ]},
  { name: "加密解密", icon: Lock, gradient: "from-purple-500 to-pink-500", tools: [
    { name: "AES 加密", desc: "AES 对称加密/解密", action: "aes" },
    { name: "RSA 工具", desc: "RSA 密钥生成/加解密", action: "rsa" },
    { name: "XOR 加密", desc: "XOR 异或加密/解密", action: "xor" },
    { name: "ROT13", desc: "ROT13 替换加密", action: "rot13" },
  ]},
  { name: "信息收集", icon: Search, gradient: "from-orange-500 to-amber-500", tools: [
    { name: "User-Agent 查看", desc: "查看你的浏览器 UA", action: "ua" },
    { name: "IP 信息查询", desc: "查询你的 IP 地址信息", action: "ip" },
    { name: "DNS 查询", desc: "DNS 记录查询", action: "dns" },
    { name: "端口扫描", desc: "常用端口扫描工具", action: "portscan" },
    { name: "子域名枚举", desc: "子域名发现工具", action: "subdomain" },
    { name: "Whois 查询", desc: "域名 Whois 信息查询", action: "whois" },
  ]},
  { name: "Web 工具", icon: Globe, gradient: "from-cyan-500 to-blue-500", tools: [
    { name: "HTTP 请求测试", desc: "发送 HTTP 请求", action: "http" },
    { name: "CORS 测试", desc: "CORS 配置测试", action: "cors" },
    { name: "Cookie 查看", desc: "查看当前 Cookie", action: "cookie" },
    { name: "Header 查看", desc: "查看请求头信息", action: "headers" },
  ]},
  { name: "在线资源", icon: ExternalLink, gradient: "from-rose-500 to-pink-500", tools: [
    { name: "CyberChef", desc: "瑞士军刀级编码工具", url: "https://gchq.github.io/CyberChef/" },
    { name: "JWT.io", desc: "JWT Token 解析", url: "https://jwt.io/" },
    { name: "Shodan", desc: "IoT 搜索引擎", url: "https://www.shodan.io/" },
    { name: "VirusTotal", desc: "恶意文件检测", url: "https://www.virustotal.com/" },
    { name: "Exploit-DB", desc: "漏洞利用数据库", url: "https://www.exploit-db.com/" },
    { name: "CVE Details", desc: "CVE 漏洞详情", url: "https://www.cvedetails.com/" },
  ]},
];

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [key, setKey] = useState("");

  const processTool = (tool: Tool) => {
    if ("url" in tool) { window.open(tool.url, "_blank"); return; }
    setActiveTool(tool.action); setInput(""); setOutput(""); setKey("");
  };

  const execute = () => {
    if (!activeTool || !input) return;
    let result = "";
    try {
      switch (activeTool) {
        case "base64":
          if (input.match(/^[A-Za-z0-9+/=]+$/)) result = atob(input);
          else result = btoa(unescape(encodeURIComponent(input)));
          break;
        case "url":
          try { result = decodeURIComponent(input); } catch { result = encodeURIComponent(input); }
          break;
        case "html":
          const ta = document.createElement("textarea");
          ta.innerHTML = input;
          result = ta.value;
          if (result === input) result = input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          break;
        case "unicode":
          try { result = JSON.parse('"' + input + '"'); } catch { result = JSON.stringify(input).slice(1, -1); }
          break;
        case "hex":
          if (input.match(/^[0-9a-fA-F ]+$/)) result = input.split(" ").map((h: string) => String.fromCharCode(parseInt(h.trim(), 16))).join("");
          else result = input.split("").map((c: string) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
          break;
        case "jwt":
          const parts = input.split(".");
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            result = "Header:\n" + JSON.stringify(header, null, 2) + "\n\nPayload:\n" + JSON.stringify(payload, null, 2);
          } else result = "无效的 JWT 格式";
          break;
        case "rot13":
          result = input.replace(/[a-zA-Z]/g, (c: string) => {
            const base = c <= "Z" ? 65 : 97;
            return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
          });
          break;
        case "ua": result = navigator.userAgent; break;
        case "cookie": result = document.cookie || "无 Cookie"; break;
        case "headers": result = "Referer: " + document.referrer + "\nOrigin: " + window.location.origin + "\nUser-Agent: " + navigator.userAgent; break;
        case "xor":
          result = input.split("").map((c: string, i: number) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join("");
          break;
        default: result = "该工具正在开发中...";
      }
    } catch (e: any) { result = "错误: " + e.message; }
    setOutput(result);
  };

  const currentTool = toolCategories.flatMap(c => c.tools).find((t): t is { name: string; desc: string; action: string } => "action" in t && t.action === activeTool);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-blue-400/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-purple-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12">
          {activeTool ? (
            <div className="mx-auto max-w-3xl animate-scale-in">
              <button onClick={() => { setActiveTool(null); setInput(""); setOutput(""); }}
                className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> 返回工具列表
              </button>
              <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
                <h2 className="mb-4 text-xl font-bold">{currentTool?.name || activeTool}</h2>
                {(activeTool === "aes" || activeTool === "xor" || activeTool === "rsa") && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium">密钥</label>
                    <input value={key} onChange={(e) => setKey(e.target.value)}
                      className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="输入密钥" />
                  </div>
                )}
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium">输入</label>
                  <textarea value={input} onChange={(e) => setInput(e.target.value)}
                    className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    rows={4} placeholder="输入内容..." />
                </div>
                <button onClick={execute}
                  className="mb-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all hover:-translate-y-0.5">
                  <Zap className="h-4 w-4" /> 执行
                </button>
                {output && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">输出</label>
                    <pre className="whitespace-pre-wrap rounded-xl border bg-muted/50 p-4 text-sm font-mono">{output}</pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h1 className="mb-3 text-4xl font-bold">
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">安全工具箱</span>
                </h1>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  网络安全工程师常用的编码、加密、信息收集工具
                </p>
              </div>

              <div className="space-y-10">
                {toolCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div key={category.name}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${category.gradient}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold">{category.name}</h2>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {category.tools.map((tool) => (
                          <button key={tool.name} onClick={() => processTool(tool)}
                            className="group relative overflow-hidden rounded-xl border bg-card/80 backdrop-blur-sm p-5 text-left transition-all hover:-translate-y-1 hover:shadow-lg card-hover glow-card">
                            <h3 className="mb-1 font-semibold group-hover:text-indigo-500 transition-colors">{tool.name}</h3>
                            <p className="text-sm text-muted-foreground">{tool.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
