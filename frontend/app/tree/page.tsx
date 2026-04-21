'use client';

import Link from 'next/link';
import { Home, TreePine } from 'lucide-react';

export default function TreePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white relative">
      {/* Back to home button */}
      <Link 
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:-translate-x-1"
      >
        <Home className="h-4 w-4" />
        <span>返回首页</span>
      </Link>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative text-center px-4">
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/30 animate-bounce">
          <TreePine className="h-10 w-10 text-white" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-yellow-400">
          🎄 圣诞树 3D 照片展示
        </h1>
        
        <p className="text-lg text-gray-300 mb-8 max-w-lg mx-auto leading-relaxed">
          使用手势控制照片：张开手掌散开照片，比"V"切换主题，伸食指查看照片
        </p>

        <Link 
          href="/tree/index.html"
          className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-full text-xl shadow-2xl shadow-yellow-500/30 transition-all hover:scale-105 hover:shadow-yellow-500/50"
        >
          <TreePine className="h-6 w-6" />
          进入圣诞树页面
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>

        <p className="mt-6 text-sm text-gray-500">
          在圣诞树上挂满你的照片回忆
        </p>
      </div>
    </div>
  );
}
