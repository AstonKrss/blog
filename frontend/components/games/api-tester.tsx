"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Loader2, Plus, Trash2, ChevronDown, ChevronRight,
  Key, Code2, AlertCircle, CheckCircle2, XCircle,
  Copy, Check, ArrowRight, Globe, Terminal, BookOpen,
  Eye, EyeOff, Save, FolderOpen, Zap, Variable, Settings,
  BarChart3, ChevronLeft, PlusCircle, FileJson, Hash,
  Braces, Play, Clock
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface HeaderItem { key: string; value: string; enabled: boolean; locked?: boolean }
interface QueryParam { key: string; value: string; enabled: boolean }
interface EnvVar { id: string; name: string; values: Record<string, string> }
interface HistoryEntry { id: string; method: string; url: string; status: number; time: number; timestamp: number }
interface TabItem { id: string; name: string; method: string; url: string; headers: HeaderItem[]; body: string; params: QueryParam[]; auth: { type: "none" | "bearer" | "basic"; token: string; username: string; password: string }; response?: ResponseData }

interface ResponseData {
  status: number; statusText: string; time: number; body: string;
  headers: Record<string, string>; size: number;
}

const PRESET_HEADERS: HeaderItem[] = [
  { key: "Content-Type", value: "application/json", enabled: true, locked: true },
  { key: "Authorization", value: "Bearer ", enabled: false, locked: false },
  { key: "Accept", value: "application/json", enabled: true, locked: false },
];

function jsonPretty(json: string): string {
  try { return JSON.stringify(JSON.parse(json), null, 2); }
  catch { return json; }
}

function jsonMinify(json: string): string {
  try { return JSON.stringify(JSON.parse(json)); }
  catch { return json; }
}

function jsonSize(json: string): string {
  const bytes = new Blob([json]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function JsonHighlight({ text }: { text: string }) {
  const colored = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"([^"]+)":/g, '<span class="text-rose-400">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-amber-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-sky-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-muted-foreground">$1</span>');
  return <pre className="text-sm font-mono leading-relaxed" dangerouslySetInnerHTML={{ __html: colored }} />;
}

function statusColor(s: number) {
  if (s < 200) return "text-gray-400";
  if (s < 300) return "text-emerald-400";
  if (s < 400) return "text-amber-400";
  return "text-red-400";
}
function statusBg(s: number) {
  if (s < 200) return "bg-gray-500/10 border-gray-500/20";
  if (s < 300) return "bg-emerald-500/10 border-emerald-500/20";
  if (s < 400) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

// Code generation (module-level — EnvVar is an interface so no closure needed)
// Env substitution is handled inside each generateCode call via applyEnv passed from component

function generateCode(tab: TabItem, env: EnvVar | null, lang: "curl" | "js" | "python"): string {
  const applyEnv = (input: string): string => {
    if (!env) return input;
    let out = input;
    for (const [k, v] of Object.entries(env.values)) {
      out = out.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
    return out;
  };

  const subUrl = applyEnv(tab.url);
  const qp = tab.params.filter(p => p.enabled && p.key);
  const urlWithParams = qp.length
    ? subUrl + (subUrl.includes("?") ? "&" : "?") + qp.map(p => `${p.key}=${applyEnv(p.value)}`).join("&")
    : subUrl;

  const headers = tab.headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: applyEnv(h.value) }));

  if (lang === "curl") {
    const lines = [`curl -X ${tab.method} '${urlWithParams}'`];
    headers.forEach(h => lines.push(`  -H '${h.key}: ${h.value}'`));
    if (tab.body.trim() && !["GET", "HEAD"].includes(tab.method)) {
      const body = applyEnv(tab.body).replace(/'/g, "\\'");
      lines.push(`  -d '${body}'`);
    }
    return lines.join(" \\\n");
  }

  if (lang === "js") {
    const hObj: Record<string, string> = {};
    headers.forEach(h => { hObj[h.key] = h.value; });
    const bodyStr = tab.body.trim() && !["GET", "HEAD"].includes(tab.method)
      ? `\n  body: JSON.stringify(${applyEnv(tab.body)}),` : "";
    return `const response = await fetch("${urlWithParams}", {
  method: "${tab.method}",
  headers: ${JSON.stringify(hObj, null, 4)}${bodyStr}
});
const data = await response.json();
console.log(data);`;
  }

  // Python
  const hLines = headers.map(h => `    "${h.key}": "${h.value}"`).join(",\n");
  const pBody = tab.body.trim() && !["GET", "HEAD"].includes(tab.method)
    ? `\ndata = ${applyEnv(tab.body)}\nresponse = requests.${tab.method.toLowerCase()}(url, headers=headers, json=data)` : "";
  return `import requests

url = "${urlWithParams}"
headers = {\n${hLines}\n}${pBody}
print(response.json())`;
}

// ─── Env Manager ─────────────────────────────────────────────────────────────
function EnvModal({ onClose, envs, onSave }: { onClose: () => void; envs: EnvVar[]; onSave: (envs: EnvVar[]) => void }) {
  const [active, setActive] = useState<EnvVar[]>(envs);
  const addEnv = () => setActive(prev => [...prev, { id: crypto.randomUUID(), name: "新环境", values: {} }]);
  const removeEnv = (id: string) => setActive(prev => prev.filter(e => e.id !== id));
  const updateEnv = (id: string, field: "name", value: string) =>
    setActive(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  const addVar = (envId: string) =>
    setActive(prev => prev.map(e => e.id === envId ? { ...e, values: { ...e.values, "": "" } } : e));
  const updateVar = (envId: string, oldKey: string, newKey: string, val: string) =>
    setActive(prev => prev.map(e => {
      if (e.id !== envId) return e;
      const vals = { ...e.values };
      const nk = oldKey === newKey ? oldKey : (delete vals[oldKey], newKey);
      vals[nk] = val;
      return { ...e, values: vals };
    }));
  const removeVar = (envId: string, key: string) =>
    setActive(prev => prev.map(e => e.id === envId ? { ...e, values: Object.fromEntries(Object.entries(e.values).filter(([k]) => k !== key)) } : e));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="w-full max-w-2xl glass-card shadow-2xl rounded-2xl overflow-hidden animate-bounce-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/20">
          <h2 className="font-bold flex items-center gap-2"><Variable className="w-4 h-4 text-violet-400" /> 环境管理</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {active.map(env => (
            <div key={env.id} className="rounded-xl border border-border/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input value={env.name} onChange={e => updateEnv(env.id, "name", e.target.value)}
                  className="flex-1 bg-transparent font-bold outline-none text-sm border-b border-transparent focus:border-violet-500 pb-1" />
                <button onClick={() => addVar(env.id)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 变量
                </button>
                <button onClick={() => removeEnv(env.id)} className="text-xs text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {Object.entries(env.values).map(([k, v], i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={k} onChange={e => updateVar(env.id, k, e.target.value, v)}
                    placeholder="KEY" className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5 text-xs font-mono border border-border/30 focus:border-violet-500/50 outline-none" />
                  <input value={v} onChange={e => updateVar(env.id, k, k, e.target.value)}
                    placeholder="value" className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5 text-xs font-mono border border-border/30 focus:border-violet-500/50 outline-none" />
                  <button onClick={() => removeVar(env.id, k)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          ))}
          <button onClick={addEnv} className="w-full py-2 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-violet-500/30 flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> 添加环境
          </button>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/30 bg-muted/10">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-border/40 hover:bg-muted transition-all">取消</button>
          <button onClick={() => { onSave(active); onClose(); }} className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg hover:-translate-y-0.5 transition-all">保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── Code Modal ──────────────────────────────────────────────────────────────
function CodeModal({ tab, env, onClose }: { tab: TabItem; env: EnvVar | null; onClose: () => void }) {
  const [lang, setLang] = useState<"curl" | "js" | "python">("curl");
  const [copied, setCopied] = useState(false);
  const code = generateCode(tab, env, lang);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="w-full max-w-2xl glass-card shadow-2xl rounded-2xl overflow-hidden animate-bounce-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/20">
          <div className="flex gap-1">
            {(["curl", "js", "python"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${lang === l ? "bg-violet-500 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                {l === "curl" ? "cURL" : l === "js" ? "JavaScript" : "Python"}
              </button>
            ))}
          </div>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
        <pre className="p-5 text-xs font-mono leading-relaxed overflow-auto max-h-80 bg-[#0d0d1a] text-slate-300">{code}</pre>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ApiTester() {
  const [tabs, setTabs] = useState<TabItem[]>([{
    id: crypto.randomUUID(), name: "新请求", method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    headers: [...PRESET_HEADERS], body: "", params: [],
    auth: { type: "none", token: "", username: "", password: "" }
  }]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"params" | "headers" | "body" | "auth" | "tests">("params");
  const [codeOpen, setCodeOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [envs, setEnvs] = useState<EnvVar[]>(() => {
    try { const s = localStorage.getItem("apifox_envs"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { const s = localStorage.getItem("apifox_history"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [showAuthVal, setShowAuthVal] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const activeEnv = envs.find(e => e.id === activeEnvId) ?? null;

  const saveEnvs = (newEnvs: EnvVar[]) => {
    setEnvs(newEnvs);
    localStorage.setItem("apifox_envs", JSON.stringify(newEnvs));
  };

  const updateTab = (id: string, changes: Partial<TabItem>) =>
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));

  const addTab = () => {
    const t: TabItem = {
      id: crypto.randomUUID(), name: "新请求", method: "GET", url: "",
      headers: [...PRESET_HEADERS], body: "", params: [],
      auth: { type: "none", token: "", username: "", password: "" }
    };
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs.filter(t => t.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[Math.min(idx, next.length - 1)].id);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!activeTab.url.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    const enabledHeaders: Record<string, string> = {};
    activeTab.headers.filter(h => h.enabled && h.key).forEach(h => {
      let v = applyEnv(h.value, activeEnv);
      // auth injection
      if (h.key === "Authorization" && activeTab.auth.type === "bearer" && activeTab.auth.token) {
        v = `Bearer ${applyEnv(activeTab.auth.token, activeEnv)}`;
      }
      if (h.key === "Authorization" && activeTab.auth.type === "basic") {
        const u = applyEnv(activeTab.auth.username, activeEnv);
        const p = applyEnv(activeTab.auth.password, activeEnv);
        v = `Basic ${btoa(`${u}:${p}`)}`;
      }
      enabledHeaders[h.key] = v;
    });

    // URL params + env substitution
    const qp = activeTab.params.filter(p => p.enabled && p.key);
    let url = applyEnv(activeTab.url, activeEnv);
    if (qp.length) url += (url.includes("?") ? "&" : "?") + qp.map(p => `${p.key}=${applyEnv(p.value, activeEnv)}`).join("&");

    // Body env substitution
    let body = applyEnv(activeTab.body, activeEnv);

    const start = performance.now();
    try {
      const opts: RequestInit = { method: activeTab.method, headers: enabledHeaders };
      if (!["GET", "HEAD", "DELETE"].includes(activeTab.method) && body.trim()) {
        opts.body = body;
      }
      const res = await fetch(url, opts);
      const elapsed = Math.round(performance.now() - start);
      let text = await res.text();
      try { text = JSON.stringify(JSON.parse(text), null, 2); } catch { /* not JSON */ }
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { respHeaders[k] = v; });
      const size = new Blob([text]).size;
      setResponse({ status: res.status, statusText: res.statusText, time: elapsed, body: text, headers: respHeaders, size });
      const h: HistoryEntry = { id: crypto.randomUUID(), method: activeTab.method, url, status: res.status, time: elapsed, timestamp: Date.now() };
      setHistory(prev => {
        const next = [h, ...prev].slice(0, 50);
        localStorage.setItem("apifox_history", JSON.stringify(next));
        return next;
      });
      // update tab with response for later viewing
      updateTab(activeTabId, { response: { status: res.status, statusText: res.statusText, time: elapsed, body: text, headers: respHeaders, size } });
    } catch (e: unknown) {
      setError((e as Error).message || "请求失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeEnv, activeTabId, updateTab]);

  // Load history entry
  const loadHistory = (h: HistoryEntry) => {
    const method = h.method as TabItem["method"];
    updateTab(activeTabId, { method, url: h.url, headers: [...PRESET_HEADERS], body: "", params: [] });
    setShowHistory(false);
  };

  // Env substitution helper
  const applyEnv = (input: string, env: EnvVar | null): string => {
    if (!env) return input;
    let out = input;
    for (const [k, v] of Object.entries(env.values)) {
      out = out.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
    return out;
  };

  // Generate code with env already substituted
  const generateCode = (tab: TabItem, env: EnvVar | null, lang: "curl" | "js" | "python"): string => {
    const subUrl = applyEnv(tab.url, env);
    const qp = tab.params.filter(p => p.enabled && p.key);
    const urlWithParams = qp.length
      ? subUrl + (subUrl.includes("?") ? "&" : "?") + qp.map(p => `${p.key}=${applyEnv(p.value, env)}`).join("&")
      : subUrl;

    const headers = tab.headers.filter(h => h.enabled && h.key).map(h => ({ key: h.key, value: applyEnv(h.value, env) }));

    if (lang === "curl") {
      const lines = [`curl -X ${tab.method} '${urlWithParams}'`];
      headers.forEach(h => lines.push(`  -H '${h.key}: ${h.value}'`));
      if (tab.body.trim() && !["GET", "HEAD"].includes(tab.method)) {
        const body = applyEnv(tab.body, env).replace(/'/g, "\\'");
        lines.push(`  -d '${body}'`);
      }
      return lines.join(" \\\n");
    }

    if (lang === "js") {
      const hObj: Record<string, string> = {};
      headers.forEach(h => { hObj[h.key] = h.value; });
      const bodyStr = tab.body.trim() && !["GET", "HEAD"].includes(tab.method)
        ? `\n  body: JSON.stringify(${applyEnv(tab.body, env)}),` : "";
      return `const response = await fetch("${urlWithParams}", {
  method: "${tab.method}",
  headers: ${JSON.stringify(hObj, null, 4)}${bodyStr}
});
const data = await response.json();
console.log(data);`;
    }

    // Python
    const hLines = headers.map(h => `    "${h.key}": "${h.value}"`).join(",\n");
    const pBody = tab.body.trim() && !["GET", "HEAD"].includes(tab.method)
      ? `\ndata = ${applyEnv(tab.body, env)}\nresponse = requests.${tab.method.toLowerCase()}(url, headers=headers, json=data)` : "";
    return `import requests

url = "${urlWithParams}"
headers = {\n${hLines}\n}${pBody}
print(response.json())`;
  };

  // Tests assertions
  const [tests, setTests] = useState<{ expr: string; expected: string }[]>([]);
  const [testResults, setTestResults] = useState<{ pass: boolean; message: string }[]>([]);

  const runTests = (body: string) => {
    const results = tests.map(t => {
      try {
        // Simple assertion: check if expression exists in body
        const pass = body.includes(t.expr) || (() => {
          try { return new Function(`"use strict"; return (${t.expr})`)(body) === true; } catch { return false; }
        })();
        return { pass, message: pass ? `✓ ${t.expr} passed` : `✗ ${t.expr} — expected ${t.expected}` };
      } catch (e) {
        return { pass: false, message: `✗ ${t.expr}: ${e}` };
      }
    });
    setTestResults(results);
  };

  useEffect(() => { if (response?.body) runTests(response.body); }, [response, tests]);

  const panelTabs = [
    { key: "params", label: "参数", icon: Variable },
    { key: "headers", label: "Headers", icon: Key },
    { key: "body", label: "Body", icon: Braces },
    { key: "auth", label: "认证", icon: Settings },
    { key: "tests", label: "Tests", icon: Play },
  ] as const;

  const methodColors: Record<string, string> = {
    GET: "text-emerald-400", POST: "text-amber-400", PUT: "text-sky-400",
    DELETE: "text-red-400", PATCH: "text-violet-400"
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
          <Send className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold">API 测试工具</h3>
          <p className="text-xs text-muted-foreground">Apifox 风格 · 环境变量 · 代码生成</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setEnvOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs hover:bg-muted transition-all">
            <Globe className="w-3.5 h-3.5" />
            {activeEnv ? activeEnv.name : "选择环境"}
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs hover:bg-muted transition-all">
            <Clock className="w-3.5 h-3.5" /> 历史
          </button>
          <button onClick={() => setCodeOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs hover:bg-muted transition-all">
            <Code2 className="w-3.5 h-3.5" /> 代码
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-medium transition-all shrink-0 border border-b-0 ${
              activeTabId === tab.id
                ? "bg-card border-violet-500/50 text-foreground"
                : "bg-muted/30 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span className={`font-bold ${methodColors[tab.method] || "text-muted-foreground"}`}>{tab.method}</span>
            {activeTabId !== tab.id && <span className="truncate max-w-20">{tab.name}</span>}
          </button>
        ))}
        <button onClick={addTab} className="shrink-0 p-2 rounded-t-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
          <Plus className="w-3.5 h-3.5" />
        </button>
        {tabs.length > 1 && (
          <button onClick={e => { e.stopPropagation(); closeTab(activeTabId, e); }}
            className="shrink-0 p-1.5 rounded-t-xl text-muted-foreground hover:text-red-400 transition-all text-xs">
            ×
          </button>
        )}
      </div>

      {/* Request URL bar */}
      <div className="flex gap-2">
        <select
          value={activeTab.method}
          onChange={e => updateTab(activeTabId, { method: e.target.value as TabItem["method"] })}
          className={`rounded-xl border border-border/50 bg-card px-3 py-3 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${methodColors[activeTab.method]}`}
        >
          {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={activeTab.url}
          onChange={e => updateTab(activeTabId, { url: e.target.value })}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="https://api.example.com/endpoint 或 {{base_url}}/posts"
          className="flex-1 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all"
        />
        <button
          onClick={send}
          disabled={loading || !activeTab.url.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 hover:shadow-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          发送
        </button>
      </div>

      {/* Panel tabs */}
      <div className="flex gap-1 border-b border-border/50">
        {panelTabs.map(p => (
          <button key={p.key} onClick={() => setActivePanel(p.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
              activePanel === p.key ? "border-violet-500 text-violet-400" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <p.icon className="w-3.5 h-3.5" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        {/* Params */}
        {activePanel === "params" && (
          <div className="p-4 space-y-2">
            {activeTab.params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={p.enabled} onChange={e => {
                  const updated = [...activeTab.params]; updated[i] = { ...p, enabled: e.target.checked };
                  updateTab(activeTabId, { params: updated });
                }} className="h-4 w-4 rounded accent-violet-500" />
                <input value={p.key} onChange={e => {
                  const updated = [...activeTab.params]; updated[i] = { ...p, key: e.target.value };
                  updateTab(activeTabId, { params: updated });
                }} placeholder="参数名" className="w-40 rounded-lg border border-border/30 bg-card px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-500/50" />
                <input value={p.value} onChange={e => {
                  const updated = [...activeTab.params]; updated[i] = { ...p, value: e.target.value };
                  updateTab(activeTabId, { params: updated });
                }} placeholder="值" className="flex-1 rounded-lg border border-border/30 bg-card px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-500/50" />
                <button onClick={() => updateTab(activeTabId, { params: activeTab.params.filter((_, j) => j !== i) })}
                  className="text-muted-foreground hover:text-red-400"><XCircle className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => updateTab(activeTabId, { params: [...activeTab.params, { key: "", value: "", enabled: true }] })}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
              <Plus className="w-3.5 h-3.5" /> 添加参数
            </button>
          </div>
        )}

        {/* Headers */}
        {activePanel === "headers" && (
          <div className="p-4 space-y-2">
            {activeTab.headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={h.enabled} onChange={e => {
                  const updated = [...activeTab.headers]; updated[i] = { ...h, enabled: e.target.checked };
                  updateTab(activeTabId, { headers: updated });
                }} className="h-4 w-4 rounded accent-violet-500" />
                <input value={h.key} onChange={e => {
                  const updated = [...activeTab.headers]; updated[i] = { ...h, key: e.target.value };
                  updateTab(activeTabId, { headers: updated });
                }} placeholder="Header-Name" disabled={h.locked}
                  className={`w-40 rounded-lg border border-border/30 bg-card px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-500/50 ${h.locked ? "opacity-50" : ""}`} />
                <input value={h.value} onChange={e => {
                  const updated = [...activeTab.headers]; updated[i] = { ...h, value: e.target.value };
                  updateTab(activeTabId, { headers: updated });
                }} placeholder="value" className="flex-1 rounded-lg border border-border/30 bg-card px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-500/50" />
                {!h.locked && <button onClick={() => updateTab(activeTabId, { headers: activeTab.headers.filter((_, j) => j !== i) })}
                  className="text-muted-foreground hover:text-red-400"><XCircle className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
            <button onClick={() => updateTab(activeTabId, { headers: [...activeTab.headers, { key: "", value: "", enabled: true }] })}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
              <Plus className="w-3.5 h-3.5" /> 添加请求头
            </button>
          </div>
        )}

        {/* Body */}
        {activePanel === "body" && (
          <div className="space-y-2 p-4">
            <div className="flex gap-1">
              {["{", "}", "[", "]", ":", '"', "\n"].map(ch => (
                <button key={ch} onClick={() => updateTab(activeTabId, { body: activeTab.body + ch })}
                  className="rounded border border-border/40 px-1.5 py-0.5 font-mono text-xs hover:bg-muted transition-colors">
                  {ch === "\n" ? "↵" : ch}
                </button>
              ))}
              <div className="ml-auto flex gap-1">
                <button onClick={() => { try { updateTab(activeTabId, { body: JSON.stringify(JSON.parse(activeTab.body), null, 2) }); } catch { alert("无效 JSON"); } }}
                  className="text-xs text-violet-400 hover:text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 hover:bg-violet-500/10">美化</button>
                <button onClick={() => { try { updateTab(activeTabId, { body: JSON.stringify(JSON.parse(activeTab.body)) }); } catch { alert("无效 JSON"); } }}
                  className="text-xs text-violet-400 hover:text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 hover:bg-violet-500/10">压缩</button>
              </div>
            </div>
            <textarea
              value={activeTab.body}
              onChange={e => updateTab(activeTabId, { body: e.target.value })}
              rows={8}
              className="w-full rounded-xl border border-border/50 bg-card px-4 py-3 font-mono text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all resize-none"
              placeholder='{"key": "value", "array": [1, 2, 3]}'
            />
          </div>
        )}

        {/* Auth */}
        {activePanel === "auth" && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              {(["none", "bearer", "basic"] as const).map(t => (
                <button key={t} onClick={() => updateTab(activeTabId, { auth: { ...activeTab.auth, type: t } })}
                  className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all ${
                    activeTab.auth.type === t ? "bg-violet-500/15 border-violet-500/40 text-violet-400" : "border-border/40 text-muted-foreground hover:bg-muted"
                  }`}>
                  {t === "none" ? "无认证" : t === "bearer" ? "Bearer Token" : "Basic Auth"}
                </button>
              ))}
            </div>
            {activeTab.auth.type === "bearer" && (
              <div className="flex items-center gap-2">
                <input type={showAuthVal ? "text" : "password"} value={activeTab.auth.token}
                  onChange={e => updateTab(activeTabId, { auth: { ...activeTab.auth, token: e.target.value } })}
                  placeholder="Bearer Token 或 {{token}}" className="flex-1 rounded-xl border border-border/30 bg-card px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-violet-500/50" />
                <button onClick={() => setShowAuthVal(!showAuthVal)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  {showAuthVal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
            {activeTab.auth.type === "basic" && (
              <div className="space-y-2">
                <input value={activeTab.auth.username} onChange={e => updateTab(activeTabId, { auth: { ...activeTab.auth, username: e.target.value } })}
                  placeholder="用户名" className="w-full rounded-xl border border-border/30 bg-card px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50" />
                <input type="password" value={activeTab.auth.password}
                  onChange={e => updateTab(activeTabId, { auth: { ...activeTab.auth, password: e.target.value } })}
                  placeholder="密码" className="w-full rounded-xl border border-border/30 bg-card px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50" />
              </div>
            )}
            <p className="text-xs text-muted-foreground/60">认证会自动注入到 Authorization 请求头，支持 <code className="text-violet-400">{"{{变量名}}"}</code> 语法</p>
          </div>
        )}

        {/* Tests */}
        {activePanel === "tests" && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">基于响应状态码的断言脚本（示例）：</p>
            <div className="space-y-2">
              {[
                "pm.test('状态码为200', () => pm.response.status === 200);",
                "pm.test('返回数据包含id', () => pm.response.json().id !== undefined);",
                "pm.test('响应时间小于500ms', () => pm.response.time < 500);",
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/30 p-2.5 bg-muted/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <code className="text-xs font-mono text-muted-foreground/80">{t}</code>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60">兼容 Postman pm.* 语法风格</p>
          </div>
        )}
      </div>

      {/* Response */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {response && (
        <div className="rounded-2xl glass-card overflow-hidden animate-fade-in border border-violet-500/10">
          {/* Status bar */}
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/20 border-b border-border/30">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black ${statusColor(response.status)}`}>{response.status}</span>
              <span className="text-sm text-muted-foreground">{response.statusText}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {response.time}ms</span>
              <span>{jsonSize(response.body)}</span>
            </div>
            <div className="ml-auto flex gap-1">
              {(["body", "headers"] as const).map(t => (
                <button key={t} onClick={() => setResponseTab(t)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${responseTab === t ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                  {t === "body" ? "响应体" : `响应头 (${Object.keys(response.headers).length})`}
                </button>
              ))}
            </div>
            <button onClick={() => {
              navigator.clipboard.writeText(response.body);
            }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs hover:bg-muted transition-all text-muted-foreground">
              <Copy className="w-3.5 w-3.5" /> 复制
            </button>
          </div>
          {/* Body */}
          {responseTab === "body" && (
            <div className="p-4 max-h-96 overflow-auto" style={{ scrollbarWidth: "thin" }}>
              <JsonHighlight text={response.body} />
            </div>
          )}
          {/* Headers */}
          {responseTab === "headers" && (
            <div className="p-4 space-y-1.5 max-h-80 overflow-auto" style={{ scrollbarWidth: "thin" }}>
              {Object.entries(response.headers).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs font-mono">
                  <span className="text-violet-400 shrink-0 w-48 truncate">{k}</span>
                  <span className="text-muted-foreground break-all">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History sidebar */}
      {showHistory && (
        <div className="fixed right-0 top-0 bottom-0 w-80 glass-card shadow-2xl z-40 border-l border-border/30 overflow-hidden flex flex-col animate-fade-in-left">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
            <h3 className="font-bold text-sm flex items-center gap-2"><ClockIcon className="w-4 h-4" /> 请求历史</h3>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground"><XCircle className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-8">暂无历史记录</p>
            ) : history.map(h => (
              <button key={h.id} onClick={() => loadHistory(h)}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-muted/50 transition-all group">
                <span className={`shrink-0 font-bold text-xs ${methodColors[h.method] || "text-muted-foreground"}`}>{h.method}</span>
                <span className="flex-1 text-xs font-mono truncate text-muted-foreground group-hover:text-foreground">{h.url}</span>
                <span className={`shrink-0 text-xs font-bold ${statusColor(h.status)}`}>{h.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {codeOpen && <CodeModal tab={activeTab} env={activeEnv} onClose={() => setCodeOpen(false)} />}
      {envOpen && <EnvModal envs={envs} onClose={() => setEnvOpen(false)} onSave={saveEnvs} />}
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}