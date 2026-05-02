"use client";

import { useState } from "react";
import { GitCommitHorizontal, Shuffle, Copy, Check, Zap } from "lucide-react";

const GITMOJIS: Record<string, { emoji: string; description: string; gitmoji: string }[]> = {
  "init": [
    { emoji: "🎉", description: "初次提交", gitmoji: ":tada:" },
    { emoji: "🚀", description: "部署/发布", gitmoji: ":rocket:" },
  ],
  "feat": [
    { emoji: "✨", description: "新功能", gitmoji: ":sparkles:" },
    { emoji: "🎨", description: "改进代码结构", gitmoji: ":art:" },
    { emoji: "⚡", description: "性能优化", gitmoji: ":zap:" },
    { emoji: "🌟", description: "添加新特性", gitmoji: ":star:" },
  ],
  "fix": [
    { emoji: "🐛", description: "修复 bug", gitmoji: ":bug:" },
    { emoji: "🩹", description: "修补补丁", gitmoji: ":plaster:" },
    { emoji: "🚑", description: "紧急修复", gitmoji: ":ambulance:" },
  ],
  "docs": [
    { emoji: "📝", description: "修改文档", gitmoji: ":memo:" },
    { emoji: "📖", description: "添加文档", gitmoji: ":books:" },
    { emoji: "📚", description: "写文档", gitmoji: ":book:" },
  ],
  "refactor": [
    { emoji: "♻️", description: "重构代码", gitmoji: ":recycle:" },
    { emoji: "🔨", description: "重构小改进", gitmoji: ":hammer:" },
    { emoji: "🛠️", description: "工具改进", gitmoji: ":wrench:" },
  ],
  "perf": [
    { emoji: "⚡", description: "性能优化", gitmoji: ":zap:" },
    { emoji: "💨", description: "提升速度", gitmoji: ":dart:" },
    { emoji: "🔥", description: "移除废弃代码", gitmoji: ":fire:" },
  ],
  "test": [
    { emoji: "✅", description: "添加测试", gitmoji: ":white_check_mark:" },
    { emoji: "🧪", description: "实验性测试", gitmoji: ":test_tube:" },
    { emoji: "👷", description: "CI 相关", gitmoji: ":construction_worker:" },
  ],
  "chore": [
    { emoji: "📦", description: "依赖更新", gitmoji: ":package:" },
    { emoji: "🏗️", description: "构建改进", gitmoji: ":construction:" },
    { emoji: "⬆️", description: "升级依赖", gitmoji: ":arrow_up:" },
    { emoji: "⬇️", description: "降级依赖", gitmoji: ":arrow_down:" },
    { emoji: "🔧", description: "配置文件", gitmoji: ":wrench:" },
  ],
  "style": [
    { emoji: "💄", description: "UI 样式修改", gitmoji: ":lipstick:" },
    { emoji: "🎨", description: "代码格式", gitmoji: ":art:" },
  ],
  "security": [
    { emoji: "🔒", description: "安全修复", gitmoji: ":lock:" },
    { emoji: "🛡️", description: "安全改进", gitmoji: ":shield:" },
  ],
  "ci": [
    { emoji: "👷", description: "CI/CD 配置", gitmoji: ":construction_worker:" },
    { emoji: "📊", description: "CI 更新", gitmoji: ":chart_with_upwards_trend:" },
  ],
};

const TYPE_LIST = [
  { key: "feat", label: "✨ feat", desc: "新功能" },
  { key: "fix", label: "🐛 fix", desc: "修复bug" },
  { key: "docs", label: "📝 docs", desc: "文档修改" },
  { key: "refactor", label: "♻️ refactor", desc: "重构" },
  { key: "perf", label: "⚡ perf", desc: "性能优化" },
  { key: "test", label: "✅ test", desc: "测试" },
  { key: "chore", label: "📦 chore", desc: "构建/工具" },
  { key: "style", label: "💄 style", desc: "样式" },
  { key: "security", label: "🔒 security", desc: "安全" },
  { key: "ci", label: "👷 ci", desc: "CI/CD" },
];

export function GitmojiGenerator() {
  const [selected, setSelected] = useState("feat");
  const [copied, setCopied] = useState<string | null>(null);
  const [random, setRandom] = useState(false);

  const options = random ? Object.values(GITMOJIS).flat() : (GITMOJIS[selected] || []);

  const getCommitMsg = (item: { gitmoji: string; description: string; emoji: string }) => {
    return `${item.emoji} ${selected}: ${item.description}`;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {TYPE_LIST.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => { setSelected(key); setRandom(false); }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 ${
              selected === key && !random
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25"
                : "glass-card text-muted-foreground hover:bg-muted hover:shadow-md"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setRandom(true)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 flex items-center gap-1.5 ${
            random
              ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25"
              : "glass-card text-muted-foreground hover:bg-muted hover:shadow-md"
          }`}
        >
          <Shuffle className="h-3.5 w-3.5" />
          随机
        </button>
      </div>

      {/* Result cards */}
      <div className="grid gap-3">
        {options.map((item, i) => {
          const msg = getCommitMsg(item);
          return (
            <div
              key={i}
              className="group relative flex items-center gap-4 rounded-2xl glass-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="text-4xl shrink-0 select-none group-hover:scale-110 transition-transform">
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium mb-1">{item.description}</div>
                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {item.gitmoji}
                </code>
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded break-all">
                  {msg}
                </code>
              </div>
              <button
                onClick={() => handleCopy(msg, `${selected}-${i}`)}
                className="shrink-0 p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
                title="复制 commit 信息"
              >
                {copied === `${selected}-${i}` ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
