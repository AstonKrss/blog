'use client';

import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';

const TOOLS = [
  {
    id: 'oss',
    name: 'OSS 安全工具',
    desc: '阿里云 OSS 安全测试 (Bucket 爆破、路径 Fuzz、接管检测)',
    icon: '☁️',
    href: '/security/tools/oss',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'web',
    name: 'Web 安全工具',
    desc: 'Web 应用安全测试 (XSS、SQL 注入检测)',
    icon: '🌐',
    href: '/security/tools/web?tool=xss',
    gradient: 'from-red-500 to-orange-500'
  },
  {
    id: 'code-audit',
    name: '代码审计 Agent',
    desc: '基于 AI Agent 的代码安全审计、风险分级和修复建议',
    icon: '🤖',
    href: '/security/tools/code-audit',
    gradient: 'from-violet-500 to-blue-500'
  },
  {
    id: 'xss',
    name: 'XSS 扫描器',
    desc: '检测跨站脚本攻击漏洞 (反射型、存储型、SVG)',
    icon: '🔬',
    href: '/security/tools/web?tool=xss',
    gradient: 'from-orange-500 to-yellow-500'
  },
  {
    id: 'sqli',
    name: 'SQL 注入扫描',
    desc: '检测 SQL 注入漏洞 (报错注入、布尔盲注、时间盲注)',
    icon: '💉',
    href: '/security/tools/web?tool=sqli',
    gradient: 'from-pink-500 to-rose-500'
  },
];

export default function SecurityToolsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[80px]" />
      </div>

      <div className="relative w-full px-4 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <Link href="/security" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-4">
              <ArrowRight className="h-4 w-4 rotate-180" />
              返回安全中心
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-xl shadow-red-500/20">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black">安全工具箱</h1>
                <p className="text-muted-foreground mt-1">网络安全测试工具集</p>
              </div>
            </div>
          </div>

          {/* Tool grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {TOOLS.map(tool => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group relative overflow-hidden rounded-2xl glass-card p-6 text-left transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl border border-transparent hover:border-red-500/20"
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tool.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                <div className={`relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <span className="text-2xl">{tool.icon}</span>
                </div>
                <h3 className="relative mb-2 text-lg font-bold group-hover:text-red-400 transition-colors">{tool.name}</h3>
                <p className="relative text-sm text-muted-foreground">{tool.desc}</p>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className={`h-5 w-5 text-red-400`} />
                </div>
              </Link>
            ))}
          </div>

          {/* Warning */}
          <div className="mt-10 p-5 rounded-2xl glass-card border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="font-bold text-yellow-400 mb-1">免责声明</h3>
                <p className="text-sm text-muted-foreground">
                  这些工具仅用于授权的安全测试和教学目的。请遵守相关法律法规，不要对未授权的系统进行扫描测试。
                  所有扫描结果仅供学习参考，作者不对使用这些工具造成的任何后果负责。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
