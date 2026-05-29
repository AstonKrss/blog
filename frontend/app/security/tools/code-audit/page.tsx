'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useAuth } from '@/components/auth-context';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clipboard,
  Code2,
  FileSearch,
  GitBranch,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type SourceType = 'repository' | 'paste';
type ScanDepth = 'quick' | 'standard' | 'deep';

type Finding = {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  file?: string;
  line?: number;
  category?: string;
  impact?: string;
  recommendation?: string;
};

type AuditResult = {
  taskId?: string;
  summary?: string;
  score?: number;
  findings?: Finding[];
  checkedFiles?: number;
  model?: string;
  durationMs?: number;
};

const FOCUS_AREAS = [
  { value: 'auth', label: '认证授权' },
  { value: 'injection', label: '注入风险' },
  { value: 'xss', label: 'XSS' },
  { value: 'ssrf', label: 'SSRF' },
  { value: 'file-upload', label: '文件上传' },
  { value: 'secrets', label: '密钥泄露' },
  { value: 'business-logic', label: '业务越权' },
  { value: 'performance', label: '性能风险' },
];

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  info: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export default function CodeAuditAgentPage() {
  const { user } = useAuth();
  const [sourceType, setSourceType] = useState<SourceType>('repository');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [includePaths, setIncludePaths] = useState('src/main/java, frontend/app, frontend/components');
  const [excludePaths, setExcludePaths] = useState('target, node_modules, .next, uploads, frontend/package-lock.json');
  const [pastedCode, setPastedCode] = useState('');
  const [scanDepth, setScanDepth] = useState<ScanDepth>('standard');
  const [useRag, setUseRag] = useState(true);
  const [focusAreas, setFocusAreas] = useState<string[]>(['auth', 'injection', 'ssrf', 'file-upload', 'secrets']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);

  const payloadPreview = useMemo(() => ({
    sourceType,
    repositoryUrl: sourceType === 'repository' ? repositoryUrl : undefined,
    branch: sourceType === 'repository' ? branch : undefined,
    includePaths: includePaths.split(',').map(item => item.trim()).filter(Boolean),
    excludePaths: excludePaths.split(',').map(item => item.trim()).filter(Boolean),
    pastedCode: sourceType === 'paste' ? pastedCode : undefined,
    scanDepth,
    useRag,
    focusAreas,
  }), [sourceType, repositoryUrl, branch, includePaths, excludePaths, pastedCode, scanDepth, useRag, focusAreas]);

  const toggleFocusArea = (value: string) => {
    setFocusAreas(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const runAudit = async () => {
    setError('');
    setResult(null);

    if (sourceType === 'repository' && !repositoryUrl.trim()) {
      setError('请输入 Git 仓库地址');
      return;
    }
    if (sourceType === 'paste' && !pastedCode.trim()) {
      setError('请粘贴需要审计的代码');
      return;
    }

    setLoading(true);
    try {
      const token = typeof window !== 'undefined'
        ? sessionStorage.getItem('auth_token') || localStorage.getItem('token')
        : '';

      const response = await fetch(`${API_BASE}/api/agents/code-audit/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payloadPreview),
      });

      const data = await response.json();
      if (!response.ok || data.code !== 0) {
        throw new Error(data.message || data.error || '代码审计 Agent 后端暂未接通');
      }
      setResult(data.data);
    } catch (e: any) {
      setError(e.message || '代码审计请求失败');
    } finally {
      setLoading(false);
    }
  };

  const exampleResult: AuditResult = {
    score: 72,
    summary: '示例：发现 1 个高危 SSRF 风险、1 个中危权限校验缺失、1 个低危日志聚合性能风险。',
    checkedFiles: 38,
    model: 'gpt-5.4',
    findings: [
      {
        severity: 'high',
        title: '用户可控 URL 被服务端直接请求',
        file: 'src/main/java/com/aston/blog/Controller/SecurityToolsController.java',
        line: 194,
        category: 'SSRF',
        impact: '攻击者可能借服务器访问内网服务。',
        recommendation: '限制协议为 http/https，解析 DNS 后阻止内网、回环、链路本地地址，并关闭危险重定向。',
      },
      {
        severity: 'medium',
        title: '管理接口依赖 Controller 手写权限判断',
        file: 'src/main/java/com/aston/blog/config/SecurityConfig.java',
        line: 49,
        category: 'Authorization',
        impact: '新增接口时容易漏鉴权。',
        recommendation: '使用 requestMatchers 或 @PreAuthorize 建立统一权限边界。',
      },
    ],
  };

  const displayResult = result || exampleResult;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full bg-blue-500/8 blur-[90px]" />
        </div>

        <div className="relative w-full px-4 py-10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <a href="/security/tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-4">
                <ArrowLeft className="h-4 w-4" />
                返回工具列表
              </a>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/20">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black">代码审计 Agent</h1>
                    <p className="text-muted-foreground">提交仓库或代码片段，生成安全审计报告</p>
                  </div>
                </div>
                <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                  user ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {user ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {user ? `已登录：${user.displayName || user.username}` : '建议登录后使用'}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              <section className="space-y-6">
                <div className="rounded-2xl glass-card p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <FileSearch className="h-5 w-5 text-violet-400" />
                    <h2 className="text-lg font-bold">审计输入</h2>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3">
                    {[
                      { value: 'repository', label: 'Git 仓库', icon: GitBranch },
                      { value: 'paste', label: '粘贴代码', icon: Clipboard },
                    ].map(item => {
                      const Icon = item.icon;
                      const active = sourceType === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => setSourceType(item.value as SourceType)}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                            active
                              ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                              : 'border-border/50 bg-card/50 text-muted-foreground hover:border-violet-500/30 hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {sourceType === 'repository' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">仓库地址</label>
                        <input
                          value={repositoryUrl}
                          onChange={e => setRepositoryUrl(e.target.value)}
                          placeholder="https://github.com/owner/repo.git"
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium">分支</label>
                          <input
                            value={branch}
                            onChange={e => setBranch(e.target.value)}
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-medium">扫描深度</label>
                          <select
                            value={scanDepth}
                            onChange={e => setScanDepth(e.target.value as ScanDepth)}
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          >
                            <option value="quick">快速：只看高风险入口</option>
                            <option value="standard">标准：入口、服务、配置、依赖</option>
                            <option value="deep">深度：跨文件数据流和修复建议</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">包含路径</label>
                        <input
                          value={includePaths}
                          onChange={e => setIncludePaths(e.target.value)}
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">排除路径</label>
                        <input
                          value={excludePaths}
                          onChange={e => setExcludePaths(e.target.value)}
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium">代码片段</label>
                      <textarea
                        value={pastedCode}
                        onChange={e => setPastedCode(e.target.value)}
                        placeholder="粘贴 Java / TypeScript / Python 代码..."
                        className="h-72 w-full resize-none rounded-xl border border-border/50 bg-card/80 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl glass-card p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-bold">审计策略</h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {FOCUS_AREAS.map(area => {
                      const active = focusAreas.includes(area.value);
                      return (
                        <button
                          key={area.value}
                          onClick={() => toggleFocusArea(area.value)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                            active
                              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                              : 'border-border/50 bg-card/40 text-muted-foreground hover:border-blue-500/30 hover:text-foreground'
                          }`}
                        >
                          {area.label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-5 flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={useRag}
                      onChange={e => setUseRag(e.target.checked)}
                      className="h-4 w-4 accent-violet-500"
                    />
                    <span>启用 RAG：让 Agent 先检索项目代码和历史报告，再给结论</span>
                  </label>

                  {error && (
                    <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={runAudit}
                    disabled={loading}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {loading ? '审计中...' : '开始代码审计'}
                  </button>
                </div>
              </section>

              <aside className="space-y-6">
                <div className="rounded-2xl glass-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    <h2 className="text-lg font-bold">后端接口预览</h2>
                  </div>
                  <div className="rounded-xl bg-background/60 p-4 font-mono text-xs text-muted-foreground">
                    <div className="mb-2 text-violet-300">POST /api/agents/code-audit/run</div>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(payloadPreview, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="rounded-2xl glass-card overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 to-blue-500" />
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-bold">{result ? '审计结果' : '结果示例'}</h2>
                      <div className="rounded-full bg-card/70 px-3 py-1 text-sm font-bold text-violet-300">
                        {displayResult.score ?? '--'} / 100
                      </div>
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      {displayResult.summary}
                    </p>
                    <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-card/50 p-3">
                        <div className="text-lg font-black">{displayResult.checkedFiles ?? 0}</div>
                        <div className="text-muted-foreground">文件</div>
                      </div>
                      <div className="rounded-xl bg-card/50 p-3">
                        <div className="text-lg font-black">{displayResult.findings?.length ?? 0}</div>
                        <div className="text-muted-foreground">发现</div>
                      </div>
                      <div className="rounded-xl bg-card/50 p-3">
                        <div className="text-lg font-black">{displayResult.durationMs ? `${Math.round(displayResult.durationMs / 1000)}s` : '--'}</div>
                        <div className="text-muted-foreground">耗时</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(displayResult.findings || []).map((finding, index) => (
                        <div key={index} className="rounded-xl border border-border/50 bg-card/50 p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${SEVERITY_STYLE[finding.severity] || SEVERITY_STYLE.info}`}>
                              {finding.severity}
                            </span>
                            {finding.category && <span className="text-xs text-muted-foreground">{finding.category}</span>}
                          </div>
                          <h3 className="mb-1 text-sm font-bold">{finding.title}</h3>
                          {finding.file && (
                            <div className="mb-2 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                              <Code2 className="h-3.5 w-3.5" />
                              {finding.file}{finding.line ? `:${finding.line}` : ''}
                            </div>
                          )}
                          {finding.impact && <p className="text-xs text-muted-foreground">影响：{finding.impact}</p>}
                          {finding.recommendation && <p className="mt-1 text-xs text-blue-300">建议：{finding.recommendation}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
