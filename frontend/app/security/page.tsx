'use client';

import Link from 'next/link';
import { Shield, BarChart3, ArrowRight } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[80px]" />
      </div>

      <div className="relative w-full px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all mb-4">
              <ArrowRight className="h-4 w-4 rotate-180" />
              返回首页
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-blue-500/20">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black">安全中心</h1>
                <p className="text-muted-foreground mt-1">网络安全相关功能</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Link
              href="/security/tools"
              className="group relative overflow-hidden rounded-2xl glass-card p-8 text-left transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl border border-transparent hover:border-blue-500/20"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                <span className="text-3xl">🔧</span>
              </div>
              <h2 className="relative mb-2 text-xl font-bold group-hover:text-blue-400 transition-colors">安全工具</h2>
              <p className="relative text-sm text-muted-foreground mb-4">CTF 题目训练、安全测试工具集</p>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <span>进入工具箱</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="group relative overflow-hidden rounded-2xl glass-card p-8 text-left transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl border border-transparent hover:border-pink-500/20"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h2 className="relative mb-2 text-xl font-bold group-hover:text-pink-400 transition-colors">使用统计</h2>
              <p className="relative text-sm text-muted-foreground mb-4">查看工具使用情况和管理统计数据</p>
              <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                <span>查看统计</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}