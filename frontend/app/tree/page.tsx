'use client';

import Link from 'next/link';

export default function TreePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <h1 className="text-4xl font-bold mb-8 text-yellow-400">🎄 圣诞树 3D 照片展示</h1>
      <p className="text-lg text-gray-300 mb-8 text-center max-w-md">
        使用手势控制照片：张开手掌散开照片，比"V"切换主题，伸食指查看照片
      </p>
      <Link 
        href="/tree/index.html"
        className="px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-full text-lg transition-all hover:scale-105"
      >
        进入圣诞树页面 →
      </Link>
    </div>
  );
}