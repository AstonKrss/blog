"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Heart, Send, Trash2, Smile } from "lucide-react";

interface Message {
  id: number;
  text: string;
  nickname: string;
  color: string;
  createdAt: number;
  mood: string;
}

const MOODS = ["😊", "😐", "😢", "🤔", "😎", "🥳", "❤️", "🔥"];
const COLORS = [
  "from-rose-500 to-pink-500",
  "from-orange-500 to-amber-400",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-blue-500",
  "from-yellow-500 to-orange-400",
];

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

export function MessageWall() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("visitorMessages") || "[]");
    } catch { return []; }
  });
  const [text, setText] = useState("");
  const [nickname, setNickname] = useState(() => localStorage.getItem("visitorName") || "");
  const [mood, setMood] = useState("😊");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: Date.now(),
      text: text.trim().slice(0, 200),
      nickname: nickname.trim().slice(0, 20) || "匿名游客",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      createdAt: Date.now(),
      mood,
    };
    const next = [msg, ...messages].slice(0, 100); // max 100 messages
    setMessages(next);
    localStorage.setItem("visitorMessages", JSON.stringify(next));
    localStorage.setItem("visitorName", nickname.trim());
    setText("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const handleDelete = (id: number) => {
    const next = messages.filter(m => m.id !== id);
    setMessages(next);
    localStorage.setItem("visitorMessages", JSON.stringify(next));
  };

  return (
    <div className="space-y-6">
      {/* Message input */}
      <div className="rounded-2xl glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4 text-rose-500" />
          <span className="font-semibold text-sm">留言板</span>
          <span className="ml-auto text-xs text-muted-foreground">{messages.length} 条留言</span>
        </div>

        {/* Mood selector */}
        <div className="flex gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`text-lg p-1.5 rounded-lg transition-all ${
                mood === m ? "bg-rose-500/10 scale-110" : "hover:bg-muted opacity-50"
              }`}
              title={m}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="你的昵称"
            className="w-32 rounded-xl border border-border/50 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm shrink-0"
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="说点什么... (最多 200 字)"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 rounded-xl border border-border/50 bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 shrink-0"
          >
            {sent ? <Heart className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
            {sent ? "已发送" : "留言"}
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-2xl glass-card py-12 text-center">
            <Smile className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">还没有留言，第一个写下你的想法吧</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={msg.id}
              className="group relative rounded-2xl glass-card p-4 animate-fade-in-up overflow-hidden"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${msg.color}`} />
              <div className="flex items-start gap-3 pl-3">
                <div className="text-2xl shrink-0">{msg.mood}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">{msg.nickname}</span>
                    <span className="text-[10px] text-muted-foreground/50">{getTimeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="删除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
