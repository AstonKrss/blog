'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Shield, Search, Cloud, Database, Key, ArrowLeft, Loader2, Trash2, Upload, FileText, Globe } from 'lucide-react';

const REGIONS = [
  { code: 'oss-cn-shanghai', name: '上海' }, { code: 'oss-cn-hangzhou', name: '杭州' },
  { code: 'oss-cn-beijing', name: '北京' }, { code: 'oss-cn-chengdu', name: '成都' },
  { code: 'oss-cn-shenzhen', name: '深圳' }, { code: 'oss-cn-hongkong', name: '香港' },
  { code: 'oss-us-west-1', name: '美西' }, { code: 'oss-us-east-1', name: '美东' },
  { code: 'oss-ap-southeast-1', name: '新加坡' }, { code: 'oss-ap-northeast-1', name: '东京' },
  { code: 'oss-eu-central-1', name: '法兰克福' },
];

const TOOL_TYPES = [
  { value: 'bucket_fuzz', label: 'Bucket 爆破', desc: '枚举存在但不可见的 Bucket', icon: Cloud },
  { value: 'path_fuzz', label: '路径 Fuzz', desc: '发现 Bucket 中的隐藏文件', icon: Search },
  { value: 'url_fuzz', label: 'URL 模板', desc: '自定义 URL 多变量 Fuzz', icon: Globe },
  { value: 'takeover', label: 'Bucket 接管', desc: '检测可接管的空 Bucket', icon: Key },
];

const LETTER_OPTIONS = [
  { value: '', label: '无' },
  { value: 'a', label: 'a-z (小写)' },
  { value: 'A', label: 'A-Z (大写)' },
  { value: 'aA', label: 'aA (混合)' },
  { value: '0-9', label: '0-9 (数字)' },
];

const MODE_OPTIONS = [
  { value: 'pattern', label: '模式生成', desc: '如 mybucket{i}、test{a}{i}' },
  { value: 'numbers', label: '纯数字', desc: '1, 2, 3, 4... 自定义范围和位数' },
  { value: 'letters', label: '纯字母', desc: 'a-z, A-Z, aA 混合' },
  { value: 'combo', label: '数字+字母组合', desc: '如 test1a, test1b, test2a...' },
  { value: 'wordlist', label: '词表文件', desc: '从文件加载字典' },
  { value: 'custom', label: '自定义列表', desc: '手动输入逗号分隔的列表' },
  { value: 'url_template', label: 'URL 模板', desc: '支持多变量模板，如 https://${bucket}.oss-cn-chengdu.aliyuncs.com/${file}' },
];

const WORDLIST_OPTIONS = [
  { value: 'common_bucket_names.txt', label: '常用 Bucket 名称 (300+)' },
];

export default function OSSScanPage() {
  const [token, setToken] = useState('');
  const [toolType, setToolType] = useState('bucket_fuzz');
  const [target, setTarget] = useState('');
  const [region, setRegion] = useState('oss-cn-chengdu');

  // 生成模式
  const [mode, setMode] = useState('pattern');
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(999);
  const [padding, setPadding] = useState(0);
  const [step, setStep] = useState(1);
  const [letters, setLetters] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [wordlistFile, setWordlistFile] = useState('common_bucket_names.txt');
  const [customList, setCustomList] = useState('');

  // URL 模板模式
  const [urlTemplate, setUrlTemplate] = useState('https://${bucket}.oss-cn-chengdu.aliyuncs.com/${file}');
  const [var1Name, setVar1Name] = useState('bucket');
  const [var2Name, setVar2Name] = useState('file');
  const [var1Mode, setVar1Mode] = useState<'numbers' | 'letters' | 'combo' | 'wordlist' | 'custom'>('numbers');
  const [var2Mode, setVar2Mode] = useState<'numbers' | 'letters' | 'combo' | 'wordlist' | 'custom'>('numbers');
  const [var1Start, setVar1Start] = useState(1);
  const [var1End, setVar1End] = useState(100);
  const [var1Padding, setVar1Padding] = useState(2);
  const [var2Start, setVar2Start] = useState(1);
  const [var2End, setVar2End] = useState(100);
  const [var2Padding, setVar2Padding] = useState(2);
  const [var1Letters, setVar1Letters] = useState('a');
  const [var2Letters, setVar2Letters] = useState('a');
  const [var1Custom, setVar1Custom] = useState('');
  const [var2Custom, setVar2Custom] = useState('');

  // 扫描状态
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('auth_token') || '';
    setToken(t);
    if (t) fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/security/oss/logs?page=1&limit=20', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) { console.log('获取日志失败'); }
  };

  const handleStartScan = async () => {
    if (!token) { alert('请先登录'); return; }
    if (!target && mode !== 'custom') { alert('请输入目标'); return; }

    const options: any = { mode, start, end, padding, step, letters, prefix, suffix };

    if (mode === 'pattern') {
      options.pattern = target.includes('{i}') ? target : `${target}{i}`;
    } else if (mode === 'wordlist') {
      options.wordlist_file = wordlistFile;
    } else if (mode === 'custom') {
      options.custom_list = customList;
    } else if (mode === 'numbers') {
      options.pattern = 'bucket';
    } else if (mode === 'letters') {
      options.pattern = 'bucket';
    } else if (mode === 'combo') {
      options.pattern = 'bucket';
    } else if (mode === 'url_template') {
      options.url_template = urlTemplate;
      // 变量1配置
      options.var1 = { name: var1Name, mode: var1Mode, start: var1Start, end: var1End, padding: var1Padding, letters: var1Letters, custom: var1Custom };
      // 变量2配置
      options.var2 = { name: var2Name, mode: var2Mode, start: var2Start, end: var2End, padding: var2Padding, letters: var2Letters, custom: var2Custom };
    }

    try {
      const res = await fetch('/api/security/oss/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tool_type: toolType, target, region, options })
      });
      const data = await res.json();
      setStatus('running'); setProgress(0); setResults([]);
      connectSSE(data.task_id);
    } catch (e: any) { alert('启动失败: ' + e.message); }
  };

  const connectSSE = (taskId: string) => {
    const eventSource = new EventSource(`/api/security/oss/sse/${taskId}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'progress': setProgress(data.progress); setCurrent(data.current); break;
          case 'found': setResults(prev => [data, ...prev]); break;
          case 'completed': setStatus('completed'); setProgress(100); eventSource.close(); fetchLogs(); break;
          case 'error': setStatus('failed'); alert('扫描出错: ' + data.message); eventSource.close(); break;
        }
      } catch (e) { console.log('解析 SSE 数据失败'); }
    };
    eventSource.onerror = () => { eventSource.close(); if (status === 'running') setStatus('idle'); };
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await fetch(`/api/security/oss/logs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchLogs();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[80px]" />
        </div>

        <div className="relative w-full px-4 py-10">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <a href="/tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-4">
                <ArrowLeft className="h-4 w-4" />
                返回工具列表
              </a>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black">OSS 安全工具</h1>
                  <p className="text-muted-foreground">阿里云 OSS 安全测试工具</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tool Type */}
                <div className="rounded-2xl glass-card p-6">
                  <h2 className="text-lg font-bold mb-4">选择工具</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {TOOL_TYPES.map(tool => {
                      const Icon = tool.icon;
                      return (
                        <button key={tool.value} onClick={() => setToolType(tool.value)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            toolType === tool.value ? 'border-blue-500 bg-blue-500/10' : 'border-border/50 hover:border-blue-500/30'
                          }`}>
                          <Icon className={`h-6 w-6 mb-2 ${toolType === tool.value ? 'text-blue-500' : 'text-muted-foreground'}`} />
                          <div className="font-semibold text-sm">{tool.label}</div>
                          <div className="text-xs text-muted-foreground">{tool.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Config */}
                <div className="rounded-2xl glass-card p-6">
                  <h2 className="text-lg font-bold mb-4">参数配置</h2>
                  <div className="space-y-4">
                    {/* 生成模式 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">生成模式</label>
                      <select value={mode} onChange={e => setMode(e.target.value)}
                        className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label} - {m.desc}</option>)}
                      </select>
                    </div>

                    {/* 前缀/后缀 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">前缀</label>
                        <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)}
                          placeholder="test"
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">后缀</label>
                        <input type="text" value={suffix} onChange={e => setSuffix(e.target.value)}
                          placeholder="_bak"
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>

                    {/* 数字范围 */}
                    {(mode === 'numbers' || mode === 'combo' || mode === 'pattern') && (
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">起始</label>
                          <input type="number" value={start} onChange={e => setStart(parseInt(e.target.value) || 1)}
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">结束</label>
                          <input type="number" value={end} onChange={e => setEnd(parseInt(e.target.value) || 999)}
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">位数（补零）</label>
                          <input type="number" value={padding} onChange={e => setPadding(parseInt(e.target.value) || 0)}
                            placeholder="0=自动"
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">步长</label>
                          <input type="number" value={step} onChange={e => setStep(parseInt(e.target.value) || 1)}
                            min="1" placeholder="1"
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                      </div>
                    )}

                    {/* 字母类型 */}
                    {(mode === 'letters' || mode === 'combo') && (
                      <div>
                        <label className="block text-sm font-medium mb-2">字母类型</label>
                        <select value={letters} onChange={e => setLetters(e.target.value)}
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                          {LETTER_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* 词表文件 */}
                    {mode === 'wordlist' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">选择词表</label>
                        <select value={wordlistFile} onChange={e => setWordlistFile(e.target.value)}
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                          {WORDLIST_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                        </select>
                      </div>
                    )}

                    {/* 自定义列表 */}
                    {mode === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">自定义列表（逗号分隔）</label>
                        <textarea value={customList} onChange={e => setCustomList(e.target.value)}
                          placeholder="bucket1, bucket2, mybucket, test123"
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    )}

                    {/* 模式字符串 */}
                    {(mode === 'pattern') && (
                      <div>
                        <label className="block text-sm font-medium mb-2">模式</label>
                        <input type="text" value={target} onChange={e => setTarget(e.target.value)}
                          placeholder="mybucket{i:1:100} 或 mybucket{a}{i}"
                          className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          <p>{"{i}"} - 数字 (1-999)，{"{i:1:100}"} - 范围，{"{i:4}"} - 补零</p>
                          <p>{"{a}"} - 小写字母，{"{A}"} - 大写字母，{"{d}"} - 数字0-9</p>
                          <p>{"{i}{j}"} - 双数字变量（01, 02...99）</p>
                        </div>
                      </div>
                    )}

                    {/* URL 模板模式 */}
                    {mode === 'url_template' && (
                      <div className="space-y-4 p-4 rounded-xl bg-card/30 border border-border/30">
                        <div>
                          <label className="block text-sm font-medium mb-2">URL 模板</label>
                          <input type="text" value={urlTemplate} onChange={e => setUrlTemplate(e.target.value)}
                            placeholder="https://${bucket}.oss-cn-chengdu.aliyuncs.com/${file}"
                            className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                          <p className="mt-1 text-xs text-muted-foreground">使用 <code className="text-blue-400">{"${变量名}"}</code> 占位，如 <code className="text-blue-400">{"${bucket}"}</code>、<code className="text-blue-400">{"${file}"}</code></p>
                        </div>

                        {/* 变量1 */}
                        <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">变量1</span>
                            <input type="text" value={var1Name} onChange={e => setVar1Name(e.target.value)}
                              placeholder="变量名"
                              className="w-24 rounded-lg border border-border/50 bg-card/80 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">类型</label>
                              <select value={var1Mode} onChange={e => setVar1Mode(e.target.value as any)}
                                className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20">
                                <option value="numbers">数字</option>
                                <option value="letters">字母</option>
                                <option value="combo">数字+字母</option>
                                <option value="custom">自定义</option>
                              </select>
                            </div>
                            {(var1Mode === 'numbers' || var1Mode === 'combo') && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium mb-1">起始</label>
                                  <input type="number" value={var1Start} onChange={e => setVar1Start(parseInt(e.target.value) || 1)}
                                    className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">结束</label>
                                  <input type="number" value={var1End} onChange={e => setVar1End(parseInt(e.target.value) || 100)}
                                    className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">补零位数</label>
                                  <input type="number" value={var1Padding} onChange={e => setVar1Padding(parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                                </div>
                              </>
                            )}
                            {var1Mode === 'letters' && (
                              <div>
                                <label className="block text-xs font-medium mb-1">字母类型</label>
                                <select value={var1Letters} onChange={e => setVar1Letters(e.target.value)}
                                  className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20">
                                  <option value="a">a-z (小写)</option>
                                  <option value="A">A-Z (大写)</option>
                                  <option value="aA">aA (混合)</option>
                                </select>
                              </div>
                            )}
                            {var1Mode === 'custom' && (
                              <div className="col-span-2">
                                <label className="block text-xs font-medium mb-1">自定义列表（逗号分隔）</label>
                                <input type="text" value={var1Custom} onChange={e => setVar1Custom(e.target.value)}
                                  placeholder="bucket1, bucket2, test"
                                  className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 变量2 */}
                        <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">变量2</span>
                            <input type="text" value={var2Name} onChange={e => setVar2Name(e.target.value)}
                              placeholder="变量名"
                              className="w-24 rounded-lg border border-border/50 bg-card/80 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">类型</label>
                              <select value={var2Mode} onChange={e => setVar2Mode(e.target.value as any)}
                                className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20">
                                <option value="numbers">数字</option>
                                <option value="letters">字母</option>
                                <option value="combo">数字+字母</option>
                                <option value="custom">自定义</option>
                              </select>
                            </div>
                            {(var2Mode === 'numbers' || var2Mode === 'combo') && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium mb-1">起始</label>
                                  <input type="number" value={var2Start} onChange={e => setVar2Start(parseInt(e.target.value) || 1)}
                                    className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">结束</label>
                                  <input type="number" value={var2End} onChange={e => setVar2End(parseInt(e.target.value) || 100)}
                                    className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">补零位数</label>
                                  <input type="number" value={var2Padding} onChange={e => setVar2Padding(parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                                </div>
                              </>
                            )}
                            {var2Mode === 'letters' && (
                              <div>
                                <label className="block text-xs font-medium mb-1">字母类型</label>
                                <select value={var2Letters} onChange={e => setVar2Letters(e.target.value)}
                                  className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/20">
                                  <option value="a">a-z (小写)</option>
                                  <option value="A">A-Z (大写)</option>
                                  <option value="aA">aA (混合)</option>
                                </select>
                              </div>
                            )}
                            {var2Mode === 'custom' && (
                              <div className="col-span-2">
                                <label className="block text-xs font-medium mb-1">自定义列表（逗号分隔）</label>
                                <input type="text" value={var2Custom} onChange={e => setVar2Custom(e.target.value)}
                                  placeholder="file1.txt, file2.txt, backup.zip"
                                  className="w-full rounded-lg border border-border/50 bg-card/80 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/20" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 预览 */}
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <div className="text-xs font-medium text-blue-400 mb-2">示例 URL</div>
                          <code className="text-xs text-muted-foreground break-all">
                            {urlTemplate.replace(/\${(\w+)}/g, (_, v) => {
                              if (v === var1Name) {
                                if (var1Mode === 'numbers') return String(var1Start).padStart(var1Padding || 1, '0');
                                if (var1Mode === 'letters') return 'a';
                                if (var1Mode === 'combo') return '1a';
                                if (var1Mode === 'custom') return var1Custom.split(',')[0]?.trim() || 'value1';
                              }
                              if (v === var2Name) {
                                if (var2Mode === 'numbers') return String(var2Start).padStart(var2Padding || 1, '0');
                                if (var2Mode === 'letters') return 'a';
                                if (var2Mode === 'combo') return '1a';
                                if (var2Mode === 'custom') return var2Custom.split(',')[0]?.trim() || 'value2';
                              }
                              return `\${${v}}`;
                            })}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* 区域 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">阿里云区域</label>
                      <select value={region} onChange={e => setRegion(e.target.value)}
                        className="w-full rounded-xl border border-border/50 bg-card/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
                      </select>
                    </div>

                    {/* 开始按钮 */}
                    <button onClick={handleStartScan} disabled={status === 'running'}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                        status === 'running' ? 'bg-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:-translate-y-0.5'
                      }`}>
                      {status === 'running' ? <><Loader2 className="h-4 w-4 animate-spin" /><span>扫描中...</span></> : <><Shield className="h-4 w-4" /><span>开始扫描</span></>}
                    </button>
                  </div>
                </div>

                {/* Results */}
                {status !== 'idle' && (
                  <div className="rounded-2xl glass-card p-6">
                    <h2 className="text-lg font-bold mb-4">{status === 'running' ? '扫描进度' : '扫描结果'}</h2>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{progress}%</span>
                        {current && <span className="text-muted-foreground truncate ml-2">{current}</span>}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    {results.length > 0 && (
                      <div className="space-y-3">
                        {results.map((r, i) => (
                          <div key={i} className="rounded-xl bg-card/50 border border-border/50 p-4 font-mono text-sm">
                            {r.type === 'bucket' && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  r.status === 'not_exist' ? 'bg-yellow-500/20 text-yellow-400' :
                                  r.status === 'exist_public' ? 'bg-emerald-500/20 text-emerald-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>{r.status}</span>
                                {r.can_takeover && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">可接管</span>}
                              </div>
                            )}
                            <div className="text-foreground">{r.name || r.url}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* History */}
              <div className="rounded-2xl glass-card p-6 h-fit sticky top-24">
                <h2 className="text-lg font-bold mb-4">扫描历史</h2>
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">暂无记录</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map(log => (
                      <div key={log.id} className="rounded-xl bg-card/50 border border-border/50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">{log.tool_type}</span>
                          <button onClick={() => handleDeleteLog(log.id)} className="text-muted-foreground hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-sm truncate">{log.target}</div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{log.region}</span>
                          <span>{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}