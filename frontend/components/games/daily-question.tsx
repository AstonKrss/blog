"use client";

import { useState, useEffect } from "react";
import { Brain, CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: number; // index
  explanation: string;
  category: "security" | "algorithm" | "linux" | "code";
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "以下哪个 HTTP 方法常用于更新资源？",
    options: ["GET", "POST", "PUT", "DELETE"],
    answer: 2,
    explanation: "PUT 通常用于更新/替换资源，POST 用于创建，GET 用于读取，DELETE 用于删除。",
    category: "security",
  },
  {
    id: 2,
    question: "XSS 攻击的全称是什么？",
    options: ["Cross-Site Scripting", "Cross-Site Request", "Code Script Injection", "Cross-Source Script"],
    answer: 0,
    explanation: "XSS = Cross-Site Scripting，跨站脚本攻击，通过在页面注入恶意脚本实现。",
    category: "security",
  },
  {
    id: 3,
    question: "Linux 中查看进程列表的命令是？",
    options: ["ls", "ps", "cat", "grep"],
    answer: 1,
    explanation: "ps 命令用于查看当前运行的进程，ls 查看文件，cat 查看文件内容，grep 搜索文本。",
    category: "linux",
  },
  {
    id: 4,
    question: "下面哪个是 CSS 变量定义方式？",
    options: ["$var", "#var", "--var", "@var"],
    answer: 2,
    explanation: "CSS 变量以 -- 开头，如 --primary-color，可在 :root {} 中定义并通过 var() 使用。",
    category: "code",
  },
  {
    id: 5,
    question: "以下哪个排序算法时间复杂度是 O(n log n)？",
    options: ["插入排序", "冒泡排序", "快速排序", "计数排序"],
    answer: 2,
    explanation: "快速排序平均时间复杂度 O(n log n)，最坏 O(n²)；计数排序是 O(n+k)，但需要额外空间。",
    category: "algorithm",
  },
  {
    id: 6,
    question: "SQL 注入的防御方法是？",
    options: ["使用 eval()", "参数化查询", "关闭数据库", "明文传输数据"],
    answer: 1,
    explanation: "使用参数化查询（Prepared Statements）可以有效防止 SQL 注入，避免将用户输入拼接到 SQL 语句中。",
    category: "security",
  },
  {
    id: 7,
    question: "Docker 容器的基础镜像一般用什么关键字引入？",
    options: ["from", "import", "base", "image"],
    answer: 0,
    explanation: "Dockerfile 中用 FROM 指令指定基础镜像，如 FROM node:18 或 FROM python:3.11。",
    category: "linux",
  },
  {
    id: 8,
    question: "以下哪个不是常见的对称加密算法？",
    options: ["AES", "DES", "RSA", "3DES"],
    answer: 2,
    explanation: "RSA 是非对称加密算法（公钥/私钥），AES、DES、3DES 都是对称加密算法。",
    category: "security",
  },
  {
    id: 9,
    question: "Git 中撤销最后一次 commit 的命令是？",
    options: ["git revert HEAD", "git reset HEAD~1", "git checkout HEAD", "git delete HEAD"],
    answer: 1,
    explanation: "git reset HEAD~1 会撤销最后一次 commit，保留更改在工作区；git revert 则创建新 commit 来撤销。",
    category: "linux",
  },
  {
    id: 10,
    question: "JavaScript 中 undefined 和 null 的区别是？",
    options: ["没有区别", "null 表示空对象，undefined 表示未定义", "undefined 表示空字符串", "两者完全一样"],
    answer: 1,
    explanation: "undefined 表示变量声明但未赋值或函数无返回值；null 表示有意地将值设为空，是赋值。",
    category: "code",
  },
];

const CATEGORIES = {
  security: "🔒 安全",
  algorithm: "🧠 算法",
  linux: "🐧 Linux",
  code: "💻 代码",
};

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

export function DailyQuestion() {
  const [todayIdx, setTodayIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [name, setName] = useState(() => localStorage.getItem("quizPlayerName") || "");
  const [showName, setShowName] = useState(false);

  const todayQuestion = QUESTIONS[todayIdx];

  useEffect(() => {
    // Pick a daily question based on the day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setTodayIdx(dayOfYear % QUESTIONS.length);
    // Load leaderboard
    try {
      setLeaderboard(JSON.parse(localStorage.getItem("quizLeaderboard") || "[]"));
    } catch { setLeaderboard([]); }
  }, []);

  const handleAnswer = (optIdx: number) => {
    if (answered) return;
    setSelected(optIdx);
    setAnswered(true);
    const isCorrect = optIdx === todayQuestion.answer;
    setCorrect(c => c + (isCorrect ? 1 : 0));
    if (isCorrect) {
      setScore(s => s + 10);
    }
  };

  const saveToLeaderboard = () => {
    if (!name.trim()) { setShowName(true); return; }
    localStorage.setItem("quizPlayerName", name.trim());
    const entry: LeaderboardEntry = {
      name: name.trim().slice(0, 15),
      score: score + (correct * 10),
      date: new Date().toLocaleDateString("zh-CN"),
    };
    const prev = JSON.parse(localStorage.getItem("quizLeaderboard") || "[]");
    prev.push(entry);
    prev.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score);
    setLeaderboard(prev.slice(0, 20));
    localStorage.setItem("quizLeaderboard", JSON.stringify(prev.slice(0, 20)));
  };

  const reset = () => {
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl glass-card p-4 text-center">
          <div className="text-xs text-muted-foreground">今日题</div>
          <div className="text-2xl font-black">{todayQuestion.id}/10</div>
        </div>
        <div className="rounded-xl glass-card p-4 text-center">
          <div className="text-xs text-muted-foreground">答对</div>
          <div className="text-2xl font-black text-emerald-500">{correct}</div>
        </div>
        <div className="rounded-xl glass-card p-4 text-center">
          <div className="text-xs text-muted-foreground">得分</div>
          <div className="text-2xl font-black text-yellow-500">{score}</div>
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl glass-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-medium text-muted-foreground">
            {CATEGORIES[todayQuestion.category]} · 判断题
          </span>
        </div>
        <h3 className="text-base font-medium leading-relaxed">{todayQuestion.question}</h3>
        <div className="space-y-2">
          {todayQuestion.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === todayQuestion.answer;
            const isWrong = isSelected && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-left transition-all ${
                  answered
                    ? isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                      : isWrong
                      ? "border-red-500/40 bg-red-500/10 text-red-500"
                      : "border-border/30 bg-muted/20 text-muted-foreground"
                    : isSelected
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-border/30 hover:border-rose-500/30 hover:bg-muted/20"
                }`}
              >
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold bg-muted text-muted-foreground">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {answered && isWrong && <XCircle className="h-4 w-4 text-red-500" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div className="rounded-xl bg-gradient-to-br from-rose-500/8 to-pink-500/8 border border-rose-500/20 p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              {selected === todayQuestion.answer ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-bold ${selected === todayQuestion.answer ? "text-emerald-500" : "text-red-500"}`}>
                {selected === todayQuestion.answer ? "回答正确！" : "回答错误"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{todayQuestion.explanation}</p>
          </div>
        )}

        {/* Actions */}
        {answered && (
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              重新选择
            </button>
            {!showName && (
              <button
                onClick={() => setShowName(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
              >
                <Trophy className="h-4 w-4" />
                记录排行榜
              </button>
            )}
          </div>
        )}

        {showName && (
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
              className="flex-1 rounded-xl border border-border/50 bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm"
              onKeyDown={(e) => e.key === "Enter" && saveToLeaderboard()}
            />
            <button
              onClick={saveToLeaderboard}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-400 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
            >
              <Trophy className="h-4 w-4" />
              上榜
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="rounded-2xl glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold text-sm">排行榜</span>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                  i === 1 ? "bg-slate-300/20 text-slate-400" :
                  i === 2 ? "bg-orange-400/20 text-orange-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <span className="font-medium flex-1">{entry.name}</span>
                <span className="font-bold text-rose-500">{entry.score} 分</span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
