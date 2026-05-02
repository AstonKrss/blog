"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldCheck, AlertTriangle, Lock, Unlock, RotateCcw, Zap } from "lucide-react";

interface Level {
  hint: string;
  weakPasswords: string[];
  checks: Array<{
    text: string;
    test: (p: string) => boolean;
  }>;
  timeLimit: number;
  bonus: string;
}

const LEVELS: Level[] = [
  {
    hint: "密码太短了，至少需要 8 个字符",
    weakPasswords: ["12345678", "password", "admin", "letmein", "abc12345"],
    checks: [
      { text: "至少 8 个字符", test: (p) => p.length >= 8 },
    ],
    timeLimit: 10,
    bonus: "简单",
  },
  {
    hint: "需要包含大写字母、小写字母、数字",
    weakPasswords: ["password123", "abcdefgh", "ABCD1234", "12345678"],
    checks: [
      { text: "至少 8 个字符", test: (p) => p.length >= 8 },
      { text: "包含大写字母 A-Z", test: (p) => /[A-Z]/.test(p) },
      { text: "包含小写字母 a-z", test: (p) => /[a-z]/.test(p) },
      { text: "包含数字 0-9", test: (p) => /[0-9]/.test(p) },
    ],
    timeLimit: 20,
    bonus: "中等",
  },
  {
    hint: "需要包含特殊字符 (!@#$%^&*)",
    weakPasswords: ["Password123", "Abcd1234", "P@ssw0rd"],
    checks: [
      { text: "至少 8 个字符", test: (p) => p.length >= 8 },
      { text: "包含大写字母", test: (p) => /[A-Z]/.test(p) },
      { text: "包含小写字母", test: (p) => /[a-z]/.test(p) },
      { text: "包含数字", test: (p) => /[0-9]/.test(p) },
      { text: "包含特殊字符 !@#$%^&*", test: (p) => /[!@#$%^&*]/.test(p) },
    ],
    timeLimit: 30,
    bonus: "困难",
  },
  {
    hint: "密码需要 12+ 字符且无规律（不能用键盘顺序）",
    weakPasswords: ["P@ssw0rd123!", "Qwer!@#$1234"],
    checks: [
      { text: "至少 12 个字符", test: (p) => p.length >= 12 },
      { text: "包含大写字母", test: (p) => /[A-Z]/.test(p) },
      { text: "包含小写字母", test: (p) => /[a-z]/.test(p) },
      { text: "包含数字", test: (p) => /[0-9]/.test(p) },
      { text: "包含特殊字符", test: (p) => /[!@#$%^&*]/.test(p) },
      { text: "避免键盘顺序 (qwerty, 123456)", test: (p) => !/(?:qwerty|123456|asdf|zxcv|abcde)/i.test(p) },
    ],
    timeLimit: 45,
    bonus: "专家",
  },
];

function getStrength(password: string): { label: string; color: string; percent: number; checks: boolean[]; level: Level } {
  const levelIdx = Math.min(LEVELS.length - 1, Math.floor(password.length / 3));
  const level = LEVELS[levelIdx];
  const checks = level.checks.map(c => c.test(password));
  const passed = checks.filter(Boolean).length;
  const percent = Math.round((passed / checks.length) * 100);
  const label = percent === 100 ? "强 🛡️" : percent > 60 ? "中 ⚠️" : "弱 🔴";
  const color = percent === 100 ? "from-emerald-500 to-teal-500" : percent > 60 ? "from-yellow-500 to-orange-400" : "from-red-500 to-rose-500";
  return { label, color, percent, checks, level };
}

export function PasswordStrengthGame() {
  const [level, setLevel] = useState(0);
  const [password, setPassword] = useState("");
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].timeLimit);
  const [playing, setPlaying] = useState(false);
  const [won, setWon] = useState(false);
  const [failed, setFailed] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("pwdGameBest") || "0"));
  const [showHint, setShowHint] = useState(true);

  const currentLevel = LEVELS[level];
  const strength = getStrength(password);
  const allPassed = strength.checks.every(Boolean);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setFailed(true);
          setPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (allPassed && playing && !won) {
      const bonus = Math.round(timeLeft * (level + 1) * 5);
      setScore(s => s + bonus);
      setWon(true);
      setPlaying(false);
      if (score + bonus > best) {
        setBest(score + bonus);
        localStorage.setItem("pwdGameBest", String(score + bonus));
      }
    }
  }, [allPassed, playing, won, timeLeft, level, score, best]);

  const startLevel = (lvl: number) => {
    setLevel(lvl);
    setPassword("");
    setTimeLeft(LEVELS[lvl].timeLimit);
    setPlaying(true);
    setWon(false);
    setFailed(false);
    setShowHint(true);
  };

  const nextLevel = () => {
    if (level < LEVELS.length - 1) {
      startLevel(level + 1);
    } else {
      // All levels done
      setPlaying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="rounded-xl glass-card p-3 text-center">
            <div className="text-xs text-muted-foreground">得分</div>
            <div className="text-xl font-black">{score}</div>
          </div>
          <div className="rounded-xl glass-card p-3 text-center">
            <div className="text-xs text-muted-foreground">最高</div>
            <div className="text-xl font-black text-yellow-500">{best}</div>
          </div>
        </div>
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map((l, i) => (
          <button
            key={i}
            onClick={() => startLevel(i)}
            disabled={playing}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 ${
              level === i
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg"
                : "glass-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {i + 1}. {l.bonus}
          </button>
        ))}
      </div>

      {/* Timer */}
      {playing && (
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-2 rounded-full bg-muted overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timeLeft <= 3 ? "bg-red-500" : timeLeft <= 6 ? "bg-yellow-500" : "bg-gradient-to-r from-rose-500 to-pink-500"
              }`}
              style={{ width: `${(timeLeft / currentLevel.timeLimit) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${timeLeft <= 3 ? "text-red-500" : "text-muted-foreground"}`}>
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Result overlay */}
      {won && !playing && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-4 animate-fade-in text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-emerald-500">过关！</span>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            +{Math.round(timeLeft * (level + 1) * 5)} 分 · 剩余 {timeLeft}s
          </div>
          {level < LEVELS.length - 1 ? (
            <button
              onClick={nextLevel}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
            >
              下一关 →
            </button>
          ) : (
            <div className="font-bold text-emerald-500">全部通关！🏆</div>
          )}
        </div>
      )}

      {failed && !playing && !won && (
        <div className="rounded-2xl glass-card p-4 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-bold text-red-500">超时了！</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">密码不够强</p>
          <button
            onClick={() => startLevel(level)}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            再试一次
          </button>
        </div>
      )}

      {/* Password input */}
      <div className="space-y-3">
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={password}
            onChange={(e) => {
              if (!playing) return;
              setPassword(e.target.value);
              setShowHint(false);
            }}
            placeholder="输入密码..."
            disabled={!playing}
            className="w-full rounded-xl border border-border/50 bg-card pl-12 pr-4 py-3.5 text-base font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm disabled:opacity-50"
          />
        </div>

        {/* Strength bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {strength.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {strength.checks.filter(Boolean).length}/{strength.checks.length} 项
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${strength.color} transition-all duration-300`}
              style={{ width: `${strength.percent}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-xl glass-card p-4 space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground mb-2">密码要求</div>
          {strength.checks.map((passed, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {passed ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={passed ? "text-emerald-500" : "text-muted-foreground"}>
                {currentLevel.checks[i].text}
              </span>
            </div>
          ))}
        </div>

        {/* Hint */}
        {showHint && playing && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground/60 bg-muted/30 rounded-xl px-3 py-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{currentLevel.hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
