"use client";

import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Shield, Code, Globe, Lock, Hash, Search, Zap, ArrowLeft, Copy, Check, Upload, FileText, QrCode, Clock, Key, Binary, FileJson, Type, Image, RefreshCw } from "lucide-react";

type ToolCategory = {
  name: string;
  icon: any;
  gradient: string;
  tools: { name: string; desc: string; component: React.ReactNode }[];
};

// Base64 工具组件
function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const process = useCallback(() => {
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
      }
    } catch { setOutput("解码失败，请检查输入是否有效"); }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>编码</button>
        <button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>解码</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入内容..." />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Zap className="h-4 w-4" /> 执行
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// URL 编码工具
function UrlTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const process = useCallback(() => {
    try {
      if (mode === "encode") {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input));
      }
    } catch { setOutput("解码失败"); }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>编码</button>
        <button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>解码</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入URL..." />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Zap className="h-4 w-4" /> 执行
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// HTML 工具
function HtmlTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const process = useCallback(() => {
    if (mode === "encode") {
      setOutput(input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
    } else {
      const ta = document.createElement("textarea");
      ta.innerHTML = input;
      setOutput(ta.value);
    }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>编码</button>
        <button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>解码</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入HTML..." />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Zap className="h-4 w-4" /> 执行
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// Unicode 工具
function UnicodeTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const process = useCallback(() => {
    try {
      if (mode === "encode") {
        setOutput(JSON.stringify(input).slice(1, -1));
      } else {
        setOutput(JSON.parse('"' + input + '"'));
      }
    } catch { setOutput("转换失败"); }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>编码</button>
        <button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>解码</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入文字..." />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Zap className="h-4 w-4" /> 执行
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// Hex 工具
function HexTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const process = useCallback(() => {
    try {
      if (mode === "encode") {
        setOutput(Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, "0")).join(" "));
      } else {
        const bytes = input.trim().split(/\s+/).map(h => parseInt(h, 16));
        setOutput(new TextDecoder().decode(new Uint8Array(bytes)));
      }
    } catch { setOutput("转换失败"); }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>文本→Hex</button>
        <button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>Hex→文本</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder={mode === "encode" ? "输入文本..." : "输入Hex (如: 48 65 6c 6c 6f)..."} />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Zap className="h-4 w-4" /> 执行
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// Binary 工具
function BinaryTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const process = useCallback(() => {
    try {
      if (mode === "encode") {
        setOutput(Array.from(new TextEncoder().encode(input)).map(b => b.toString(2).padStart(8, "0")).join(" "));
      } else {
        const bytes = input.trim().split(/\s+/).map(b => parseInt(b, 2));
        setOutput(new TextDecoder().decode(new Uint8Array(bytes)));
      }
    } catch { setOutput("转换失败"); }
  }, [input, mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setMode("encode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "encode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>文本→二进制</button>
        <button onClick={() => { setMode("decode"); setOutput(""); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "decode" ? "bg-indigo-500 text-white" : "bg-muted"}`}>二进制→文本</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder={mode === "encode" ? "输入文本..." : "输入二进制 (如: 01001000 01100101)..."} />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Zap className="h-4 w-4" /> 执行
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// JWT 解析器
function JwtTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<any>(null);

  const parse = useCallback(() => {
    try {
      const parts = input.split(".");
      if (parts.length !== 3) { setOutput({ error: "无效的JWT格式" }); return; }
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      setOutput({ header, payload, signature: parts[2] });
    } catch { setOutput({ error: "解析失败" }); }
  }, [input]);

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-24" placeholder="输入JWT Token..." />
      <button onClick={parse} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Key className="h-4 w-4" /> 解析
      </button>
      {output && (
        <div className="space-y-3">
          {output.error ? (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">{output.error}</div>
          ) : (
            <>
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 text-sm font-medium text-emerald-400">Header</div>
                <pre className="text-sm font-mono overflow-x-auto">{JSON.stringify(output.header, null, 2)}</pre>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 text-sm font-medium text-cyan-400">Payload</div>
                <pre className="text-sm font-mono overflow-x-auto">{JSON.stringify(output.payload, null, 2)}</pre>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 text-sm font-medium text-yellow-400">Signature</div>
                <div className="text-sm font-mono break-all text-muted-foreground">{output.signature}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ROT13 工具
function Rot13Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const process = useCallback(() => {
    setOutput(input.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= "Z" ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    }));
  }, [input]);

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入文本..." />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <RefreshCw className="h-4 w-4" /> 加密/解密
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// 哈希计算工具
function HashTool({ algorithm }: { algorithm: string }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const process = useCallback(async () => {
    try {
      if (algorithm === "md5") {
        setOutput("浏览器不支持 MD5，请使用 SHA-256 或 SHA-512");
        return;
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      let hashBuffer: ArrayBuffer;
      switch (algorithm) {
        case "sha1": hashBuffer = await crypto.subtle.digest("SHA-1", data); break;
        case "sha256": hashBuffer = await crypto.subtle.digest("SHA-256", data); break;
        case "sha512": hashBuffer = await crypto.subtle.digest("SHA-512", data); break;
        default: return;
      }
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      setOutput(hashArray.map(b => b.toString(16).padStart(2, "0")).join(""));
    } catch { setOutput("计算失败"); }
  }, [input, algorithm]);

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入文本..." />
      <button onClick={process} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white">
        <Hash className="h-4 w-4" /> 计算 {algorithm.toUpperCase()}
      </button>
      {output && <ResultBox value={output} />}
    </div>
  );
}

// 密码生成器
function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState("");
  const [options, setOptions] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true });

  const generate = useCallback(() => {
    let chars = "";
    if (options.uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (options.lowercase) chars += "abcdefghijklmnopqrstuvwxyz";
    if (options.numbers) chars += "0123456789";
    if (options.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    if (!chars) { setPassword("请至少选择一项"); return; }
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    setPassword(Array.from(arr).map(x => chars[x % chars.length]).join(""));
  }, [length, options]);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">密码长度: {length}</label>
        <input type="range" min="8" max="64" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full" />
      </div>
      <div className="flex flex-wrap gap-3">
        {(["uppercase", "lowercase", "numbers", "symbols"] as const).map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={options[opt]} onChange={(e) => setOptions(p => ({ ...p, [opt]: e.target.checked }))} className="rounded" />
            <span className="text-sm">{opt === "uppercase" ? "大写字母" : opt === "lowercase" ? "小写字母" : opt === "numbers" ? "数字" : "特殊符号"}</span>
          </label>
        ))}
      </div>
      <button onClick={generate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-medium text-white">
        <Key className="h-4 w-4" /> 生成密码
      </button>
      {password && <ResultBox value={password} copyable />}
    </div>
  );
}

// JSON 格式化工具
function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const process = useCallback((action: "format" | "minify" | "validate") => {
    try {
      const parsed = JSON.parse(input);
      if (action === "format") setOutput(JSON.stringify(parsed, null, 2));
      else if (action === "minify") setOutput(JSON.stringify(parsed));
      setError("");
    } catch (e: any) { setError(e.message); setOutput(""); }
  }, [input]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => process("format")} className={`px-4 py-2 rounded-lg text-sm font-medium ${"bg-indigo-500 text-white"}`}>格式化</button>
        <button onClick={() => process("minify")} className={`px-4 py-2 rounded-lg text-sm font-medium bg-muted`}>压缩</button>
        <button onClick={() => process("validate")} className={`px-4 py-2 rounded-lg text-sm font-medium bg-muted`}>验证</button>
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="输入JSON..." />
      {error ? <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{error}</div> : output && <ResultBox value={output} />}
    </div>
  );
}

// 时间戳转换器
function TimestampTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<any>(null);

  const convert = useCallback(() => {
    try {
      const num = parseInt(input);
      const isMs = input.length > 10;
      const date = new Date(isMs ? num : num * 1000);
      setOutput({
        unix: Math.floor(date.getTime() / 1000),
        unixMs: date.getTime(),
        iso: date.toISOString(),
        local: date.toLocaleString("zh-CN"),
        utc: date.toUTCString(),
      });
    } catch { setOutput({ error: "无效的时间戳" }); }
  }, [input]);

  const now = () => {
    const date = new Date();
    setInput(Math.floor(date.getTime() / 1000).toString());
    setOutput({
      unix: Math.floor(date.getTime() / 1000),
      unixMs: date.getTime(),
      iso: date.toISOString(),
      local: date.toLocaleString("zh-CN"),
      utc: date.toUTCString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 font-mono text-sm" placeholder="输入时间戳 (秒或毫秒)..." />
        <button onClick={convert} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
          <Clock className="h-4 w-4" /> 转换
        </button>
        <button onClick={now} className="flex items-center gap-2 rounded-xl bg-muted px-5 py-2.5 text-sm font-medium">
          当前时间
        </button>
      </div>
      {output && (
        output.error ? <div className="p-4 rounded-xl border border-red-500/30 text-red-400">{output.error}</div> :
        <div className="grid gap-2 text-sm font-mono">
          <div className="flex justify-between p-3 rounded-xl border"><span className="text-muted-foreground">Unix (秒)</span><span className="text-emerald-400">{output.unix}</span></div>
          <div className="flex justify-between p-3 rounded-xl border"><span className="text-muted-foreground">Unix (毫秒)</span><span className="text-cyan-400">{output.unixMs}</span></div>
          <div className="flex justify-between p-3 rounded-xl border"><span className="text-muted-foreground">ISO 8601</span><span className="text-yellow-400">{output.iso}</span></div>
          <div className="flex justify-between p-3 rounded-xl border"><span className="text-muted-foreground">本地时间</span><span>{output.local}</span></div>
          <div className="flex justify-between p-3 rounded-xl border"><span className="text-muted-foreground">UTC</span><span className="text-muted-foreground">{output.utc}</span></div>
        </div>
      )}
    </div>
  );
}

// UUID 生成器
function UuidTool() {
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = useCallback(() => {
    const newUuids: string[] = [];
    for (let i = 0; i < count; i++) {
      newUuids.push(crypto.randomUUID());
    }
    setUuids(newUuids);
  }, [count]);

  const v4 = () => {
    const newUuids: string[] = [];
    for (let i = 0; i < count; i++) {
      newUuids.push("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      }));
    }
    setUuids(newUuids);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label className="text-sm">生成数量:</label>
        <input type="number" min="1" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-20 rounded-xl border bg-muted/50 px-3 py-2 text-sm" />
        <button onClick={generate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
          <Key className="h-4 w-4" /> UUID v4
        </button>
      </div>
      {uuids.length > 0 && (
        <div className="space-y-2">
          {uuids.map((uuid, i) => <ResultBox key={i} value={uuid} copyable />)}
        </div>
      )}
    </div>
  );
}

// 文件哈希工具
function FileHashTool() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const process = useCallback(async (algorithm: string) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase(), buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setResults(r => ({ ...r, [algorithm]: hash }));
    } catch { }
  }, [file]);

  const processAll = useCallback(async () => {
    if (!file) return;
    const algs = ["SHA-1", "SHA-256", "SHA-512"];
    const results: Record<string, string> = {};
    for (const alg of algs) {
      try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest(alg, buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        results[alg] = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      } catch { results[alg] = "计算失败"; }
    }
    setResults(results);
  }, [file]);

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-colors"
        onClick={() => document.getElementById("file-input")?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}>
        <input id="file-input" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{file ? file.name : "点击或拖拽文件到此处"}</p>
        {file && <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(2)} KB</p>}
      </div>
      {file && (
        <>
          <button onClick={processAll} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
            <Hash className="h-4 w-4" /> 计算所有哈希
          </button>
          {Object.entries(results).map(([alg, hash]) => (
            <div key={alg} className="space-y-1">
              <div className="text-sm font-medium">{alg}</div>
              <ResultBox value={hash} copyable />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// 正则表达式测试器
function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState("");

  const test = useCallback(() => {
    try {
      const regex = new RegExp(pattern, flags);
      const results = input.match(regex) || [];
      setMatches(results);
      setError("");
    } catch (e: any) { setError(e.message); setMatches([]); }
  }, [pattern, flags, input]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 font-mono text-sm" placeholder="正则表达式..." />
        <input value={flags} onChange={(e) => setFlags(e.target.value)} className="w-20 rounded-xl border bg-muted/50 px-4 py-2.5 font-mono text-sm text-center" placeholder="flags" />
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-32" placeholder="测试文本..." />
      <button onClick={test} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <Search className="h-4 w-4" /> 测试
      </button>
      {error && <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{error}</div>}
      {matches.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">匹配结果 ({matches.length} 个)</div>
          <div className="flex flex-wrap gap-2">
            {matches.map((m, i) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-sm">{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// User-Agent 查看器
function UaTool() {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  
  return (
    <div className="space-y-4">
      <ResultBox value={ua} copyable />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-4 rounded-xl border"><div className="text-muted-foreground mb-1">设备类型</div><div className={isMobile ? "text-amber-400" : "text-emerald-400"}>{isMobile ? "移动设备" : "桌面设备"}</div></div>
        <div className="p-4 rounded-xl border"><div className="text-muted-foreground mb-1">浏览器</div><div className="truncate">{navigator.userAgent.split(" ")[0]}</div></div>
        <div className="p-4 rounded-xl border"><div className="text-muted-foreground mb-1">语言</div><div className="text-emerald-400">{navigator.language}</div></div>
        <div className="p-4 rounded-xl border"><div className="text-muted-foreground mb-1">屏幕</div><div className="text-cyan-400">{window.screen.width} x {window.screen.height}</div></div>
      </div>
    </div>
  );
}

// 二维码生成器
function QrCodeTool() {
  const [input, setInput] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const generate = useCallback(() => {
    if (input) setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}`);
  }, [input]);

  return (
    <div className="space-y-4">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border bg-muted/50 px-4 py-3 font-mono text-sm h-24" placeholder="输入内容..." />
      <button onClick={generate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white">
        <QrCode className="h-4 w-4" /> 生成二维码
      </button>
      {qrUrl && <img src={qrUrl} alt="QR Code" className="mx-auto rounded-xl border" />}
    </div>
  );
}

// 结果展示组件
function ResultBox({ value, copyable }: { value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group">
      <pre className="w-full rounded-xl border bg-muted/50 p-4 text-sm font-mono break-all whitespace-pre-wrap">{value}</pre>
      {copyable && (
        <button onClick={copy} className="absolute top-2 right-2 p-2 rounded-lg bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}

// 工具列表
const toolCategories: ToolCategory[] = [
  {
    name: "编码解码",
    icon: Code,
    gradient: "from-blue-500 to-cyan-500",
    tools: [
      { name: "Base64", desc: "Base64 编码/解码", component: <Base64Tool /> },
      { name: "URL", desc: "URL 编码/解码", component: <UrlTool /> },
      { name: "HTML", desc: "HTML 实体编码/解码", component: <HtmlTool /> },
      { name: "Unicode", desc: "Unicode 编码/解码", component: <UnicodeTool /> },
      { name: "Hex", desc: "十六进制转换", component: <HexTool /> },
      { name: "二进制", desc: "二进制转换", component: <BinaryTool /> },
      { name: "ROT13", desc: "ROT13 加密/解密", component: <Rot13Tool /> },
    ],
  },
  {
    name: "哈希与密码",
    icon: Hash,
    gradient: "from-emerald-500 to-teal-500",
    tools: [
      { name: "SHA-256", desc: "SHA-256 哈希计算", component: <HashTool algorithm="sha256" /> },
      { name: "SHA-512", desc: "SHA-512 哈希计算", component: <HashTool algorithm="sha512" /> },
      { name: "密码生成", desc: "随机密码生成器", component: <PasswordGenerator /> },
      { name: "文件哈希", desc: "计算文件哈希值", component: <FileHashTool /> },
    ],
  },
  {
    name: "JWT & 正则",
    icon: Key,
    gradient: "from-purple-500 to-pink-500",
    tools: [
      { name: "JWT 解析", desc: "解析 JWT Token", component: <JwtTool /> },
      { name: "正则测试", desc: "正则表达式测试器", component: <RegexTool /> },
    ],
  },
  {
    name: "格式化工具",
    icon: FileJson,
    gradient: "from-orange-500 to-amber-500",
    tools: [
      { name: "JSON", desc: "JSON 格式化/压缩", component: <JsonTool /> },
      { name: "时间戳", desc: "Unix 时间戳转换", component: <TimestampTool /> },
      { name: "UUID", desc: "UUID 生成器", component: <UuidTool /> },
    ],
  },
  {
    name: "其他工具",
    icon: Globe,
    gradient: "from-cyan-500 to-blue-500",
    tools: [
      { name: "User-Agent", desc: "查看浏览器信息", component: <UaTool /> },
      { name: "二维码", desc: "生成二维码", component: <QrCodeTool /> },
    ],
  },
];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<{ name: string; component: React.ReactNode } | null>(null);

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
              <button onClick={() => setActiveTool(null)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> 返回工具列表
              </button>
              <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
                <h2 className="mb-6 text-2xl font-bold flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${activeCategory ? toolCategories.find(c => c.name === activeCategory)?.gradient : "from-indigo-500 to-purple-500"}`}>
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  {activeTool.name}
                </h2>
                {activeTool.component}
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
                  网络安全从业者常用的编码、加密、哈希、信息收集工具
                </p>
              </div>

              <div className="space-y-12">
                {toolCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <div key={category.name}>
                      <div className="mb-6 flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${category.gradient} shadow-lg`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">{category.name}</h2>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {category.tools.map((tool) => (
                          <button key={tool.name} onClick={() => { setActiveTool({ name: tool.name, component: tool.component }); setActiveCategory(category.name); }}
                            className="group relative overflow-hidden rounded-2xl border bg-card/80 p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 card-hover">
                            <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                            <h3 className="mb-2 text-lg font-semibold group-hover:text-indigo-500 transition-colors">{tool.name}</h3>
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
