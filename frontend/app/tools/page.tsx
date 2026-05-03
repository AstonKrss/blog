"use client";

import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Shield, Code, Globe, Lock, Hash, Search, Zap, ArrowLeft, Copy, Check, Upload, FileText, QrCode, Clock, Key, Binary, FileJson, Type, Image, RefreshCw, ArrowRight, Gamepad2, Brain, Keyboard, LockKeyhole, MessageSquare, Send, BookOpen, ExternalLink } from "lucide-react";
import { Game2048 } from "@/components/games/game-2048";
import { SnakeGame } from "@/components/games/snake-game";
import { TypingRunner } from "@/components/games/typing-runner";
import { PasswordStrengthGame } from "@/components/games/password-game";
import { TypeSpeedTest } from "@/components/games/type-speed-test";
import { GitmojiGenerator } from "@/components/games/gitmoji-generator";
import { RetroConsole } from "@/components/games/retro-console";
import { DailyQuestion } from "@/components/games/daily-question";
import { MessageWall } from "@/components/games/message-wall";
import { ApiTester } from "@/components/games/api-tester";

type ToolCategory = {
  name: string;
  icon: any;
  gradient: string;
  color: string;
  tools: { name: string; desc: string; component: React.ReactNode }[];
};

// Result component
function ResultBox({ value, copyable }: { value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group">
      <pre className="w-full rounded-xl border bg-card/80 p-4 text-sm font-mono break-all whitespace-pre-wrap glass-card">{value}</pre>
      {copyable && (
        <button onClick={copy} className="absolute top-2 right-2 p-2 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-all hover:bg-muted">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

// Tool components
function Base64Tool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [mode, setMode] = useState<"encode" | "decode">("encode");
  const process = useCallback(() => { try { setOutput(mode === "encode" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input)))); } catch { setOutput("解码失败，请检查输入是否有效"); } }, [input, mode]);
  return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "encode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>编码</button><button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "decode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>解码</button></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder="输入内容..." />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Zap className="h-4 w-4 relative z-10" /><span className="relative z-10">执行</span></button></div>;
}

function UrlTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [mode, setMode] = useState<"encode" | "decode">("encode");
  const process = useCallback(() => { try { setOutput(mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input)); } catch { setOutput("解码失败"); } }, [input, mode]);
  return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "encode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>编码</button><button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "decode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>解码</button></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder="输入URL..." />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Zap className="h-4 w-4 relative z-10" /><span className="relative z-10">执行</span></button></div>;
}

function HtmlTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [mode, setMode] = useState<"encode" | "decode">("encode");
  const process = useCallback(() => { mode === "encode" ? setOutput(input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")) : (() => { const ta = document.createElement("textarea"); ta.innerHTML = input; setOutput(ta.value); })(); }, [input, mode]);
  return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "encode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>编码</button><button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "decode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>解码</button></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder="输入HTML..." />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Zap className="h-4 w-4 relative z-10" /><span className="relative z-10">执行</span></button></div>;
}

function UnicodeTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [mode, setMode] = useState<"encode" | "decode">("encode");
  const process = useCallback(() => { try { setOutput(mode === "encode" ? JSON.stringify(input).slice(1, -1) : JSON.parse('"' + input + '"')); } catch { setOutput("转换失败"); } }, [input, mode]);
  return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "encode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>编码</button><button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "decode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>解码</button></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder="输入文字..." />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Zap className="h-4 w-4 relative z-10" /><span className="relative z-10">执行</span></button></div>;
}

function HexTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [mode, setMode] = useState<"encode" | "decode">("encode");
  const process = useCallback(() => { try { mode === "encode" ? setOutput(Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, "0")).join(" ")) : setOutput(new TextDecoder().decode(new Uint8Array(input.trim().split(/\s+/).map(h => parseInt(h, 16))))); } catch { setOutput("转换失败"); } }, [input, mode]);
  return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "encode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>文本→Hex</button><button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "decode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>Hex→文本</button></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder={mode === "encode" ? "输入文本..." : "输入Hex (如: 48 65 6c 6c 6f)..."} />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Zap className="h-4 w-4 relative z-10" /><span className="relative z-10">执行</span></button></div>;
}

function BinaryTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [mode, setMode] = useState<"encode" | "decode">("encode");
  const process = useCallback(() => { try { mode === "encode" ? setOutput(Array.from(new TextEncoder().encode(input)).map(b => b.toString(2).padStart(8, "0")).join(" ")) : setOutput(new TextDecoder().decode(new Uint8Array(input.trim().split(/\s+/).map(b => parseInt(b, 2))))); } catch { setOutput("转换失败"); } }, [input, mode]);
  return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "encode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>文本→二进制</button><button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === "decode" ? "bg-blue-500 text-white shadow-md" : "bg-muted hover:bg-muted/80"}`}>二进制→文本</button></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder={mode === "encode" ? "输入文本..." : "输入二进制 (如: 01001000 01100101)..."} />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Zap className="h-4 w-4 relative z-10" /><span className="relative z-10">执行</span></button></div>;
}

function Rot13Tool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState("");
  const process = useCallback(() => { setOutput(input.replace(/[a-zA-Z]/g, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base); })); }, [input]);
  return <div className="space-y-4"><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder="输入文本..." />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><RefreshCw className="h-4 w-4 relative z-10" /><span className="relative z-10">加密/解密</span></button></div>;
}

function JwtTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState<any>(null);
  const parse = useCallback(() => { try { const parts = input.split("."); if (parts.length !== 3) { setOutput({ error: "无效的JWT格式" }); return; } setOutput({ header: JSON.parse(atob(parts[0])), payload: JSON.parse(atob(parts[1])), signature: parts[2] }); } catch { setOutput({ error: "解析失败" }); } }, [input]);
  return <div className="space-y-4"><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all" placeholder="输入JWT Token..." />{output && (<div className="space-y-3">{output.error ? <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 glass-card">{output.error}</div> : <><div className="rounded-xl border bg-card/80 p-4 glass-card"><div className="mb-2 text-sm font-medium text-emerald-400">Header</div><pre className="text-sm font-mono overflow-x-auto">{JSON.stringify(output.header, null, 2)}</pre></div><div className="rounded-xl border bg-card/80 p-4 glass-card"><div className="mb-2 text-sm font-medium text-cyan-400">Payload</div><pre className="text-sm font-mono overflow-x-auto">{JSON.stringify(output.payload, null, 2)}</pre></div><div className="rounded-xl border bg-card/80 p-4 glass-card"><div className="mb-2 text-sm font-medium text-yellow-400">Signature</div><div className="text-sm font-mono break-all text-muted-foreground">{output.signature}</div></div></>}</div>)}<button onClick={parse} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Key className="h-4 w-4 relative z-10" /><span className="relative z-10">解析</span></button></div>;
}

function HashTool({ algorithm }: { algorithm: string }) {
  const [input, setInput] = useState(""); const [output, setOutput] = useState("");
  const process = useCallback(async () => { try { if (algorithm === "md5") { setOutput("浏览器不支持 MD5，请使用 SHA-256"); return; } const encoder = new TextEncoder(); const data = encoder.encode(input); let hashBuffer: ArrayBuffer; if (algorithm === "sha1") hashBuffer = await crypto.subtle.digest("SHA-1", data); else if (algorithm === "sha256") hashBuffer = await crypto.subtle.digest("SHA-256", data); else hashBuffer = await crypto.subtle.digest("SHA-512", data); setOutput(Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")); } catch { setOutput("计算失败"); } }, [input, algorithm]);
  return <div className="space-y-4"><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" placeholder="输入文本..." />{output && <ResultBox value={output} copyable />}<button onClick={process} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Hash className="h-4 w-4 relative z-10" /><span className="relative z-10">计算 {algorithm.toUpperCase()}</span></button></div>;
}

function PasswordGenerator() {
  const [length, setLength] = useState(16); const [password, setPassword] = useState(""); const [options, setOptions] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true });
  const generate = useCallback(() => { let chars = ""; if (options.uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; if (options.lowercase) chars += "abcdefghijklmnopqrstuvwxyz"; if (options.numbers) chars += "0123456789"; if (options.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"; if (!chars) { setPassword("请至少选择一项"); return; } const arr = new Uint32Array(length); crypto.getRandomValues(arr); setPassword(Array.from(arr).map(x => chars[x % chars.length]).join("")); }, [length, options]);
  return <div className="space-y-4"><div className="flex items-center gap-4"><label className="text-sm font-medium shrink-0">密码长度</label><input type="range" min="8" max="64" value={length} onChange={(e) => setLength(Number(e.target.value))} className="flex-1" /><span className="w-8 text-center font-mono font-bold text-rose-500">{length}</span></div><div className="flex flex-wrap gap-3">{([{key: "uppercase", label: "大写字母"}, {key: "lowercase", label: "小写字母"}, {key: "numbers", label: "数字"}, {key: "symbols", label: "特殊符号"}] as const).map(opt => (<label key={opt.key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={options[opt.key]} onChange={(e) => setOptions(p => ({ ...p, [opt.key]: e.target.checked }))} className="rounded accent-rose-500" /><span className="text-sm">{opt.label}</span></label>))}</div>{password && <ResultBox value={password} copyable />}<button onClick={generate} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Key className="h-4 w-4 relative z-10" /><span className="relative z-10">生成密码</span></button></div>;
}

function JsonTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [error, setError] = useState("");
  const process = useCallback((action: "format" | "minify" | "validate") => { try { const parsed = JSON.parse(input); if (action === "format") setOutput(JSON.stringify(parsed, null, 2)); else if (action === "minify") setOutput(JSON.stringify(parsed)); setError(""); } catch (e: any) { setError(e.message); setOutput(""); } }, [input]);
  return <div className="space-y-4"><div className="flex gap-2">{(["format", "minify", "validate"] as const).map(a => <button key={a} onClick={() => process(a)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${"bg-rose-500 text-white shadow-md"}`}>{a === "format" ? "格式化" : a === "minify" ? "压缩" : "验证"}</button>)}</div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" placeholder="输入JSON..." />{error ? <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm glass-card">{error}</div> : output && <ResultBox value={output} copyable />}</div>;
}

function TimestampTool() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState<any>(null);
  const convert = useCallback(() => { try { const num = parseInt(input); const isMs = input.length > 10; const date = new Date(isMs ? num : num * 1000); setOutput({ unix: Math.floor(date.getTime() / 1000), unixMs: date.getTime(), iso: date.toISOString(), local: date.toLocaleString("zh-CN"), utc: date.toUTCString() }); } catch { setOutput({ error: "无效的时间戳" }); } }, [input]);
  const now = () => { const date = new Date(); setInput(Math.floor(date.getTime() / 1000).toString()); setOutput({ unix: Math.floor(date.getTime() / 1000), unixMs: date.getTime(), iso: date.toISOString(), local: date.toLocaleString("zh-CN"), utc: date.toUTCString() }); };
  return <div className="space-y-4"><div className="flex gap-2"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" placeholder="输入时间戳 (秒或毫秒)..." /><button onClick={convert} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Clock className="h-4 w-4 relative z-10" /><span className="relative z-10">转换</span></button><button onClick={now} className="px-4 py-2.5 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-all">当前时间</button></div>{output && (output.error ? <div className="p-4 rounded-xl border border-red-500/30 text-red-400 glass-card">{output.error}</div> : <div className="grid gap-2 text-sm font-mono"><div className="flex justify-between p-3 rounded-xl border glass-card"><span className="text-muted-foreground">Unix (秒)</span><span className="text-emerald-400">{output.unix}</span></div><div className="flex justify-between p-3 rounded-xl border glass-card"><span className="text-muted-foreground">Unix (毫秒)</span><span className="text-cyan-400">{output.unixMs}</span></div><div className="flex justify-between p-3 rounded-xl border glass-card"><span className="text-muted-foreground">ISO 8601</span><span className="text-yellow-400">{output.iso}</span></div><div className="flex justify-between p-3 rounded-xl border glass-card"><span className="text-muted-foreground">本地时间</span><span>{output.local}</span></div><div className="flex justify-between p-3 rounded-xl border glass-card"><span className="text-muted-foreground">UTC</span><span className="text-muted-foreground">{output.utc}</span></div></div>)}</div>;
}

function UuidTool() {
  const [count, setCount] = useState(1); const [uuids, setUuids] = useState<string[]>([]);
  const generate = useCallback(() => { const newUuids: string[] = []; for (let i = 0; i < count; i++) newUuids.push(crypto.randomUUID()); setUuids(newUuids); }, [count]);
  return <div className="space-y-4"><div className="flex gap-3 items-center"><label className="text-sm font-medium shrink-0">生成数量</label><input type="number" min="1" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-20 rounded-xl border border-border/50 bg-card/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" /><button onClick={generate} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Key className="h-4 w-4 relative z-10" /><span className="relative z-10">生成 UUID</span></button></div>{uuids.length > 0 && <div className="space-y-2">{uuids.map((uuid, i) => <ResultBox key={i} value={uuid} copyable />)}</div>}</div>;
}

function FileHashTool() {
  const [file, setFile] = useState<File | null>(null); const [results, setResults] = useState<Record<string, string>>({});
  const processAll = useCallback(async () => { if (!file) return; const algs = ["SHA-1", "SHA-256", "SHA-512"]; const newResults: Record<string, string> = {}; for (const alg of algs) { try { const buffer = await file.arrayBuffer(); const hashBuffer = await crypto.subtle.digest(alg, buffer); newResults[alg] = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join(""); } catch { newResults[alg] = "计算失败"; } } setResults(newResults); }, [file]);
  return <div className="space-y-4"><div className="border-2 border-dashed border-border/50 rounded-2xl p-10 text-center cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-all glass-card" onClick={() => document.getElementById("file-input")?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}><input id="file-input" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground font-medium">{file ? file.name : "点击或拖拽文件到此处"}</p>{file && <p className="text-sm text-muted-foreground mt-2">{(file.size / 1024).toFixed(2)} KB</p>}</div>{file && <><button onClick={processAll} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Hash className="h-4 w-4 relative z-10" /><span className="relative z-10">计算所有哈希</span></button>{Object.entries(results).map(([alg, hash]) => <div key={alg} className="space-y-1"><div className="text-sm font-medium text-rose-500">{alg}</div><ResultBox value={hash} copyable /></div>)}</>}</div>;
}

function RegexTool() {
  const [pattern, setPattern] = useState(""); const [flags, setFlags] = useState("g"); const [input, setInput] = useState(""); const [matches, setMatches] = useState<string[]>([]); const [error, setError] = useState("");
  const test = useCallback(() => { try { const regex = new RegExp(pattern, flags); setMatches(input.match(regex) || []); setError(""); } catch (e: any) { setError(e.message); setMatches([]); } }, [pattern, flags, input]);
  return <div className="space-y-4"><div className="flex gap-2"><input value={pattern} onChange={(e) => setPattern(e.target.value)} className="flex-1 rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all" placeholder="正则表达式..." /><input value={flags} onChange={(e) => setFlags(e.target.value)} className="w-20 rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all" placeholder="flags" /></div><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all" placeholder="测试文本..." />{error && <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm glass-card">{error}</div>}{matches.length > 0 && <div><div className="mb-2 text-sm font-medium text-emerald-400">匹配结果 ({matches.length} 个)</div><div className="flex flex-wrap gap-2">{matches.map((m, i) => <span key={i} className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-sm border border-emerald-500/20">{m}</span>)}</div></div>}<button onClick={test} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><Search className="h-4 w-4 relative z-10" /><span className="relative z-10">测试</span></button></div>;
}

function UaTool() {
  const ua = navigator.userAgent; const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  return <div className="space-y-4"><ResultBox value={ua} copyable /><div className="grid grid-cols-2 gap-3 text-sm">{[{label: "设备类型", value: isMobile ? "移动设备" : "桌面设备", color: isMobile ? "text-amber-400" : "text-emerald-400"}, {label: "语言", value: navigator.language, color: "text-emerald-400"}, {label: "屏幕", value: `${window.screen.width} x ${window.screen.height}`, color: "text-cyan-400"}, {label: "时区", value: Intl.DateTimeFormat().resolvedOptions().timeZone, color: "text-pink-400"}].map(item => <div key={item.label} className="p-4 rounded-xl border glass-card"><div className="text-xs text-muted-foreground mb-1.5">{item.label}</div><div className={`font-medium ${item.color}`}>{item.value}</div></div>)}</div></div>;
}

function QrCodeTool() {
  const [input, setInput] = useState(""); const [qrUrl, setQrUrl] = useState("");
  const generate = useCallback(() => { if (input) setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}`); }, [input]);
  return <div className="space-y-4"><textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card/80 p-4 font-mono text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all" placeholder="输入内容..." />{qrUrl && <img src={qrUrl} alt="QR Code" className="mx-auto rounded-xl border glass-card" />}<button onClick={generate} className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" /><QrCode className="h-4 w-4 relative z-10" /><span className="relative z-10">生成二维码</span></button></div>;
}

const toolCategories: ToolCategory[] = [
  { name: "实用资源", icon: BookOpen, gradient: "from-blue-500 to-cyan-500", color: "text-blue-500", tools: [] }, // filled from resources data below
  { name: "开发工具", icon: Send, gradient: "from-violet-500 to-purple-600", color: "text-violet-500", tools: [
    { name: "API 测试器", desc: "发送 HTTP 请求，查看格式化响应", component: <ApiTester /> },
  ] },
  { name: "编码解码", icon: Code, gradient: "from-blue-500 to-cyan-500", color: "text-blue-500", tools: [{ name: "Base64", desc: "Base64 编码/解码", component: <Base64Tool /> }, { name: "URL", desc: "URL 编码/解码", component: <UrlTool /> }, { name: "HTML", desc: "HTML 实体编码/解码", component: <HtmlTool /> }, { name: "Unicode", desc: "Unicode 编码/解码", component: <UnicodeTool /> }, { name: "Hex", desc: "十六进制转换", component: <HexTool /> }, { name: "二进制", desc: "二进制转换", component: <BinaryTool /> }, { name: "ROT13", desc: "ROT13 加密/解密", component: <Rot13Tool /> }] },
  { name: "哈希与密码", icon: Hash, gradient: "from-emerald-500 to-teal-500", color: "text-emerald-500", tools: [{ name: "SHA-256", desc: "SHA-256 哈希计算", component: <HashTool algorithm="sha256" /> }, { name: "SHA-512", desc: "SHA-512 哈希计算", component: <HashTool algorithm="sha512" /> }, { name: "密码生成", desc: "随机密码生成器", component: <PasswordGenerator /> }, { name: "文件哈希", desc: "计算文件哈希值", component: <FileHashTool /> }] },
  { name: "JWT & 正则", icon: Key, gradient: "from-pink-500 to-pink-500", color: "text-pink-500", tools: [{ name: "JWT 解析", desc: "解析 JWT Token", component: <JwtTool /> }, { name: "正则测试", desc: "正则表达式测试器", component: <RegexTool /> }] },
  { name: "格式化工具", icon: FileJson, gradient: "from-orange-500 to-amber-500", color: "text-orange-500", tools: [{ name: "JSON", desc: "JSON 格式化/压缩", component: <JsonTool /> }, { name: "时间戳", desc: "Unix 时间戳转换", component: <TimestampTool /> }, { name: "UUID", desc: "UUID 生成器", component: <UuidTool /> }] },
  { name: "其他工具", icon: Globe, gradient: "from-cyan-500 to-blue-500", color: "text-cyan-500", tools: [{ name: "User-Agent", desc: "查看浏览器信息", component: <UaTool /> }, { name: "二维码", desc: "生成二维码", component: <QrCodeTool /> }] },
  { name: "互动留言", icon: MessageSquare, gradient: "from-orange-500 to-amber-400", color: "text-orange-500", tools: [{ name: "留言墙", desc: "访客留言板", component: <MessageWall /> }] },
];

// Resources data (merged from /resources page)
const resourceData = [
  { name: "freeCodeCamp", desc: "免费编程学习平台", url: "https://www.freecodecamp.org/" },
  { name: "Coursera", desc: "全球顶尖在线课程", url: "https://www.coursera.org/" },
  { name: "MDN Web Docs", desc: "Mozilla 开发者文档", url: "https://developer.mozilla.org/" },
  { name: "LeetCode", desc: "算法刷题平台", url: "https://leetcode.cn/" },
  { name: "GitHub", desc: "全球最大的代码托管平台", url: "https://github.com/" },
  { name: "Stack Overflow", desc: "开发者问答社区", url: "https://stackoverflow.com/" },
  { name: "PortSwigger Academy", desc: "Web 安全免费课程", url: "https://portswigger.net/web-security" },
  { name: "HackTheBox", desc: "在线渗透测试平台", url: "https://www.hackthebox.com/" },
  { name: "OWASP", desc: "Web 应用安全指南", url: "https://owasp.org/" },
  { name: "ChatGPT", desc: "OpenAI 对话 AI", url: "https://chat.openai.com/" },
  { name: "Claude", desc: "Anthropic AI 助手", url: "https://claude.ai/" },
  { name: "Spring Boot 文档", desc: "官方文档", url: "https://docs.spring.io/spring-boot/" },
  { name: "Excalidraw", desc: "手绘风格白板", url: "https://excalidraw.com/" },
  { name: "REGEX101", desc: "正则表达式测试", url: "https://regex101.com/" },
];

function ResourceCard({ name, desc, url }: { name: string; desc: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-2xl glass-card p-5 text-left transition-all duration-400 hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-blue-500/20">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-sm mb-1 group-hover:text-blue-400 transition-colors">{name}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
      </div>
    </a>
  );
}

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("实用资源");
  const [activeTool, setActiveTool] = useState<{ name: string; component: React.ReactNode } | null>(null);

  const currentCat = toolCategories.find(c => c.name === activeCategory) || toolCategories[0];
  const isResource = activeCategory === "实用资源";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-pink-500/8 blur-[80px]" />
        </div>

        <div className="relative w-full px-4 py-10">
          {activeTool ? (
            <div className="max-w-4xl animate-fade-in-up">
              <button onClick={() => setActiveTool(null)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all group">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                返回工具列表
              </button>
              <div className="rounded-2xl glass-card overflow-hidden shadow-xl">
                <div className={`h-1 bg-gradient-to-r ${currentCat.gradient}`} />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${currentCat.gradient} shadow-lg`}>
                      <currentCat.icon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-black">{activeTool.name}</h2>
                  </div>
                  {activeTool.component}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-8">
              {/* Left sidebar */}
              <aside className="w-48 shrink-0">
                <div className="rounded-2xl glass-card p-4 sticky top-24 space-y-1">
                  {toolCategories.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button key={cat.name} onClick={() => setActiveCategory(cat.name)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          activeCategory === cat.name
                            ? `bg-gradient-to-r ${cat.gradient} text-white shadow-md`
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Right content */}
              <div className="flex-1 min-w-0">
                {/* Category header */}
                <div className="mb-8 flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${currentCat.gradient} shadow-lg`}>
                    <currentCat.icon className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-black">{activeCategory}</h1>
                </div>

                {/* Tool grid */}
                {isResource ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {resourceData.map(r => <ResourceCard key={r.name} {...r} />)}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentCat.tools.map(tool => (
                      <button key={tool.name}
                        onClick={() => setActiveTool({ name: tool.name, component: tool.component })}
                        className="group relative overflow-hidden rounded-2xl glass-card p-6 text-left transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl border border-transparent hover:border-rose-500/20">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${currentCat.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                        <div className={`relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${currentCat.gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                          <currentCat.icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="relative mb-2 text-base font-bold group-hover:text-rose-400 transition-colors">{tool.name}</h3>
                        <p className="relative text-sm text-muted-foreground">{tool.desc}</p>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          <ArrowRight className={`h-5 w-5 ${currentCat.color}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}