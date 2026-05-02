"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Keyboard, RotateCcw, Trophy } from "lucide-react";

interface Word {
  text: string;
  typed: string;
}

const WORDS = [
  "const", "let", "var", "function", "async", "await", "return",
  "import", "export", "class", "interface", "extends", "implements",
  "React", "useState", "useEffect", "useCallback", "useRef",
  "Spring", "Docker", "Kubernetes", "Nginx", "Linux", "Git",
  "axios", "fetch", "JSON", "Array", "Object", "Promise",
  "TypeScript", "Next.js", "Tailwind", "API", "SSR", "CSR",
  "devops", "jenkins", "ci/cd", "nginx", "firewall", "kernel",
];

function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function buildWordList(count: number): Word[] {
  return Array.from({ length: count }, () => ({ text: getRandomWord(), typed: "" }));
}

export function TypeSpeedTest() {
  const [words, setWords] = useState<Word[]>([]);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [finished, setFinished] = useState(false);
  const [totalTyped, setTotalTyped] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const totalWords = 30;

  const init = useCallback(() => {
    setWords(buildWordList(totalWords));
    setStarted(false);
    setStartTime(0);
    setElapsed(0);
    setCursor(0);
    setErrors(0);
    setWpm(0);
    setFinished(false);
    setTotalTyped(0);
    elapsedRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { init(); }, [init]);

  const currentWordIdx = Math.min(Math.floor(cursor / totalWords * words.length), words.length - 1);
  const currentCharIdx = cursor % (words[currentWordIdx]?.text.length || 1);

  const finish = useCallback((finalCursor: number, finalErrors: number, finalElapsed: number) => {
    setFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const time = finalElapsed || 1;
    const correct = finalCursor - finalErrors;
    const wpmCalc = Math.round((correct / 5) / (time / 60));
    setWpm(wpmCalc);
    setTotalTyped(finalCursor);
    const prev = JSON.parse(localStorage.getItem("typeSpeedRecords") || "[]");
    prev.push({ wpm: wpmCalc, errors: finalErrors, date: new Date().toLocaleDateString("zh-CN"), time });
    prev.sort((a: unknown, b: unknown) => (b as { wpm: number }).wpm - (a as { wpm: number }).wpm);
    localStorage.setItem("typeSpeedRecords", JSON.stringify(prev.slice(0, 10)));
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished) return;
    if (!started) {
      setStarted(true);
      const now = Date.now();
      setStartTime(now);
      timerRef.current = setInterval(() => {
        elapsedRef.current = Math.floor((Date.now() - now) / 1000);
        setElapsed(elapsedRef.current);
        const correct = cursor - errors;
        setWpm(Math.round((correct / 5) / (elapsedRef.current / 60)));
      }, 100);
    }
    const val = e.target.value.toLowerCase();
    const curWord = words[currentWordIdx];
    if (!curWord) return;

    if (val.length > curWord.text.length) {
      const newCursor = cursor + 1;
      const newWordIdx = Math.floor(newCursor / totalWords * words.length);
      if (newWordIdx >= words.length) {
        finish(newCursor, errors, elapsedRef.current);
        return;
      }
      setCursor(newCursor);
    }
  }, [finished, started, words, currentWordIdx, cursor, errors, finish]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!started) return;
      const newCursor = cursor + 1;
      const newWordIdx = Math.floor(newCursor / totalWords * words.length);
      if (newWordIdx >= words.length) {
        finish(newCursor, errors, elapsedRef.current);
      } else {
        setCursor(newCursor);
        inputRef.current!.value = "";
      }
    }
  }, [started, cursor, words, errors, finish]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const accuracy = totalTyped > 0 ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "速度", value: wpm, unit: "WPM", color: "from-rose-500 to-pink-500" },
          { label: "用时", value: formatTime(elapsed), unit: "", color: "from-orange-500 to-amber-500", isText: true },
          { label: "错误", value: errors, unit: "个", color: "from-red-500 to-rose-500" },
          { label: "准确率", value: accuracy, unit: "%", color: "from-emerald-500 to-teal-500" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl glass-card p-4 text-center bg-gradient-to-br ${stat.color}/10 border border-transparent hover:border-current/10 transition-all`}>
            {stat.isText ? (
              <div className="text-2xl font-black">{stat.value}</div>
            ) : (
              <>
                <div className="text-2xl font-black">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}{stat.unit && ` · ${stat.unit}`}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Word display */}
      <div className="rounded-2xl glass-card p-6 min-h-[120px]">
        <div className="flex flex-wrap gap-2">
          {words.map((word, wi) => {
            const isDone = wi < currentWordIdx;
            const isCurrent = wi === currentWordIdx;
            return (
              <span
                key={wi}
                className={`text-base font-mono px-1.5 py-0.5 rounded transition-all ${
                  isDone ? "text-green-500" : isCurrent ? "" : "text-muted-foreground/40"
                }`}
              >
                {word.text.split("").map((ch, ci) => {
                  const isCharDone = isDone || (isCurrent && ci < currentCharIdx);
                  return (
                    <span
                      key={ci}
                      className={`transition-colors ${
                        isCharDone
                          ? "text-green-500"
                          : isCurrent && ci === currentCharIdx
                          ? "bg-rose-500/30 text-foreground rounded"
                          : "text-muted-foreground"
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="开始输入上面的单词，按空格跳到下一个..."
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={finished}
          className="w-full rounded-xl border border-border/50 bg-card pl-12 pr-4 py-4 text-base font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
        />
        <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={init}
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          重新开始
        </button>
        {finished && (
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg">
            <Trophy className="h-4 w-4" />
            完成！最高 WPM: {wpm}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {(() => {
        const records = JSON.parse(localStorage.getItem("typeSpeedRecords") || "[]");
        if (records.length === 0) return null;
        return (
          <div className="rounded-2xl glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-sm">排行榜</span>
            </div>
            <div className="space-y-2">
              {records.slice(0, 5).map((r: unknown, i: number) => {
                const record = r as { wpm: number; errors: number; date: string };
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-slate-300/20 text-slate-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-bold">{record.wpm} WPM</span>
                    <span className="text-muted-foreground text-xs ml-auto">{record.date} · 错误 {record.errors}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
