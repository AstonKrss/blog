'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Shield, AlertTriangle, Search, X, Database, Code, ArrowLeft, Loader2 } from 'lucide-react';

const PAYLOAD_TYPES = {
  xss: {
    name: 'XSS 扫描',
    icon: Code,
    color: 'text-orange-500',
    gradient: 'from-orange-500 to-red-500',
    description: '检测跨站脚本攻击漏洞',
    techniques: [
      { name: 'script_tag', desc: 'Script 标签' },
      { name: 'img_onerror', desc: 'Img onerror' },
      { name: 'svg_onload', desc: 'SVG onload' },
      { name: 'iframe_js', desc: 'Iframe javascript' },
      { name: 'body_onload', desc: 'Body onload' },
      { name: 'input_onfocus', desc: 'Input onfocus' },
      { name: 'stored', desc: '存储型 XSS' },
      { name: 'filter_bypass', desc: 'Filter 绕过' },
    ]
  },
  sqli: {
    name: 'SQL 注入扫描',
    icon: Database,
    color: 'text-red-500',
    gradient: 'from-red-500 to-pink-500',
    description: '检测 SQL 注入漏洞',
    techniques: [
      { name: 'error_based', desc: '报错注入' },
      { name: 'boolean_blind', desc: '布尔盲注' },
      { name: 'time_blind', desc: '时间盲注' },
      { name: 'union', desc: 'UNION 注入' },
    ]
  }
};

type Finding = {
  technique?: string;
  payload?: string;
  severity?: string;
  description: string;
  reflection?: string;
  delay?: number;
  column_count?: number;
  db_type?: string;
};

type Results = {
  vulnerable: boolean;
  findings: Finding[];
  techniques: string[];
  db_type?: string;
};

function WebSecurityContent() {
  const searchParams = useSearchParams();
  const rawToolType = searchParams.get('tool');
  const validToolType = (rawToolType === 'xss' || rawToolType === 'sqli') ? rawToolType : 'xss';
  const tool = PAYLOAD_TYPES[validToolType];
  const [url, setUrl] = useState('');
  const [param, setParam] = useState('q');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!url) {
      setError('请输入 URL');
      return;
    }

    setScanning(true);
    setError('');
    setResults(null);

    try {
      const endpoint = validToolType === 'xss' ? '/api/security/web/xss/scan' : '/api/security/web/sqli/scan';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, param })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '扫描失败');
      setResults(data);
    } catch (e: any) {
      setError(e.message || '扫描失败');
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <a href="/security/tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-4">
          <ArrowLeft className="h-4 w-4" />
          返回工具列表
        </a>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-lg`}>
            <tool.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{tool.name}</h1>
            <p className="text-muted-foreground">{tool.description}</p>
          </div>
        </div>
      </div>

      {/* Scan Form */}
      <div className="rounded-2xl glass-card p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">目标 URL</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/search?q=test"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-border/50 bg-card/80 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">测试参数</label>
            <input
              type="text"
              value={param}
              onChange={(e) => setParam(e.target.value)}
              placeholder="q"
              className="w-32 px-4 py-3 rounded-xl border border-border/50 bg-card/80 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className={`group relative inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden ${
              scanning ? 'bg-gray-500' : `bg-gradient-to-r ${tool.gradient}`
            }`}
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>扫描中...</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                <span>开始扫描</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl glass-card p-4 mb-6 border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="rounded-2xl glass-card overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${tool.gradient}`} />
          <div className="p-6">
            {/* Status */}
            <div className="flex items-center gap-3 mb-6">
              {results.vulnerable ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-500">发现安全漏洞！</div>
                    <div className="text-sm text-muted-foreground">
                      检测到 {results.findings.length} 个问题
                      {results.db_type && ` (${results.db_type})`}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <X className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-500">未检测到漏洞</div>
                    <div className="text-sm text-muted-foreground">
                      常规检测未发现问题
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Findings */}
            {results.findings.length > 0 && (
              <div className="space-y-3">
                {results.findings.map((finding, idx) => (
                  <div key={idx} className="rounded-xl bg-card/50 border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {finding.severity || 'medium'}
                      </span>
                      <span className="text-sm font-medium">
                        {finding.technique && tool.techniques.find(t => t.name === finding.technique)?.desc}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{finding.description}</p>
                    {finding.payload && (
                      <div className="mt-2 p-2 rounded-lg bg-background/50 font-mono text-xs break-all text-red-400 whitespace-pre-wrap">
                        {finding.payload.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Techniques */}
            {results.techniques && results.techniques.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-medium mb-2">使用的检测技术</div>
                <div className="flex flex-wrap gap-2">
                  {results.techniques.map(tech => {
                    const info = tool.techniques.find(t => t.name === tech);
                    return (
                      <span key={tech} className="px-3 py-1 rounded-full bg-card/50 border border-border/50 text-xs">
                        {info?.desc || tech}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function WebSecurityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-red-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-orange-500/8 blur-[80px]" />
        </div>

        <div className="relative w-full px-4 py-10">
          <div className="max-w-4xl mx-auto">
            <Suspense fallback={<div className="animate-pulse text-muted-foreground">加载中...</div>}>
              <WebSecurityContent />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}