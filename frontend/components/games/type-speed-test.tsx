"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Keyboard, RotateCcw, Trophy } from "lucide-react";

interface Word {
  text: string;
  typed: string; // what user actually typed for this word
}

const WORDS_POOL = [
  "const", "let", "var", "function", "async", "await", "return",
  "import", "export", "class", "interface", "extends", "implements",
  "React", "useState", "useEffect", "useCallback", "useRef",
  "Spring", "Docker", "Kubernetes", "Nginx", "Linux", "Git",
  "axios", "fetch", "JSON", "Array", "Object", "Promise",
  "TypeScript", "Next", "Tailwind", "API", "SSR", "CSR",
  "devops", "jenkins", "ci", "cd", "nginx", "firewall",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildWordList(count: number): Word[] {
  const pool = shuffle(WORDS_POOL);
  return pool.slice(0, count).map(text => ({ text, typed: "" }));
}

export function TypeSpeedTest() {
  const [words, setWords] = useState<Word[]>([]);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [wordIdx, setWordIdx] = useState(0); // which word we're on
  const [charIdx, setCharIdx] = useState(0); // char position within current word
  const [errors, setErrors] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [wpm, setWpm] = useState<number>(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const TOTAL = 30;

  const init = useCallback(() => {
    setWords(buildWordList(TOTAL));
    setStarted(false);
    setStartTime(0);
    setElapsed(0);
    setWordIdx(0);
    setCharIdx(0);
    setErrors(0);
    setTotalTyped(0);
    setWpm(0);
    setFinished(false);
    startTimeRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current!.value = "";
    }, 50);
  }, []);

  useEffect(() => { init(); }, [init]);

  // Finish
  const doFinish = useCallback((finalElapsed: number) => {
    setFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const secs = finalElapsed || 1;
    // characters per minute / 5 = words per minute
    const wpmCalc = Math.round(totalTyped / 5 / (secs / 60));
    setWpm(wpmCalc);
    const prev = JSON.parse(localStorage.getItem("typeSpeedRecords") || "[]");
    prev.push({ wpm: wpmCalc, errors, date: new Date().toLocaleDateString("zh-CN"), time: secs, total: totalTyped });
    prev.sort((a: unknown, b: unknown) => (b as { wpm: number }).wpm - (a as { wpm: number }).wpm);
    localStorage.setItem("typeSpeedRecords", JSON.stringify(prev.slice(0, 10)));
  }, [errors, totalTyped]);

  // Timer
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
      setElapsed(secs);
      const wpmCalc = Math.round(totalTyped / 5 / (secs / 60));
      setWpm(wpmCalc);
    }, 100);
  };

  // OnChange: typed a character
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished) return;
    const raw = e.target.value;
    if (!raw) return;

    // First keystroke starts timer
    if (!started) {
      startTimer();
      setStarted(true);
    }

    const cur = words[wordIdx];
    if (!cur) return;

    const typed = raw.toLowerCase();
    const expected = cur.text.toLowerCase();
    const expectedChar = expected[charIdx];

    if (!expectedChar) return; // word already complete

    const lastChar = typed.slice(-1); // the newly typed character
    const newCharIdx = charIdx + 1;

    if (lastChar === expectedChar) {
      // Correct
      const newTyped = cur.typed + lastChar;
      const updated = [...words];
      updated[wordIdx] = { ...cur, typed: newTyped };
      setWords(updated);
      setTotalTyped(t => t + 1);

      if (newCharIdx >= expected.length) {
        // Word complete — move to next
        if (wordIdx + 1 >= TOTAL) {
          doFinish((Date.now() - startTimeRef.current) / 1000);
        } else {
          setWordIdx(w => w + 1);
          setCharIdx(0);
          inputRef.current!.value = "";
        }
      } else {
        setCharIdx(newCharIdx);
        inputRef.current!.value = typed; // keep what they've typed
      }
    } else {
      // Wrong character
      const newTyped = cur.typed + lastChar;
      const updated = [...words];
      updated[wordIdx] = { ...cur, typed: newTyped };
      setWords(updated);
      setErrors(e => e + 1);
      setTotalTyped(t => t + 1);

      if (newCharIdx >= expected.length) {
        if (wordIdx + 1 >= TOTAL) {
          doFinish((Date.now() - startTimeRef.current) / 1000);
        } else {
          setWordIdx(w => w + 1);
          setCharIdx(0);
          inputRef.current!.value = "";
        }
      } else {
        setCharIdx(newCharIdx);
        inputRef.current!.value = typed;
      }
    }
  }, [finished, started, words, wordIdx, charIdx, doFinish]);

  // KeyDown: Space → skip to next word (count as error for remaining chars)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " ") {
      e.preventDefault();
      if (!started) return;
      const cur = words[wordIdx];
      if (!cur) return;

      // Skip: remaining chars in current word are counted as errors
      const remaining = cur.text.length - charIdx;
      if (remaining > 0) setErrors(e => e + remaining);

      if (wordIdx + 1 >= TOTAL) {
        doFinish((Date.now() - startTimeRef.current) / 1000);
      } else {
        setWordIdx(w => w + 1);
        setCharIdx(0);
        inputRef.current!.value = "";
      }
    }
  }, [started, words, wordIdx, charIdx, doFinish]);

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
            const isDone = wi < wordIdx;
            const isCurrent = wi === wordIdx;
            return (
              <span
                key={wi}
                className={`text-base font-mono px-1.5 py-0.5 rounded transition-all ${
                  isDone ? "text-green-500" : isCurrent ? "" : "text-muted-foreground/40"
                }`}
              >
                {word.text.split("").map((ch, ci) => {
                  const isCharDone = isDone || (isCurrent && ci < charIdx);
                  // Check if this char was typed wrong
                  const wasWrong = isCurrent && ci < word.typed.length && word.typed[ci] !== word.text[ci];
                  return (
                    <span
                      key={ci}
                      className={`transition-colors ${
                        wasWrong
                          ? "bg-red-500/30 text-red-400"
                          : isCharDone
                          ? "text-green-500"
                          : isCurrent && ci === charIdx
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
          placeholder="输入单词，正确显示绿色，错误显示红色，空格跳过当前词..."
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={finished}
          className="w-full rounded-xl border border-border/50 bg-card pl-12 pr-4 py-4 text-base font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
            style={{ width: `${(wordIdx / TOTAL) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{wordIdx}/{TOTAL}</span>
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
            完成！{wpm} WPM
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
              <span className="font-semibold text-sm">历史排行榜</span>
            </div>
            <div className="space-y-2">
              {records.slice(0, 5).map((r: unknown, i: number) => {
                const record = r as { wpm: number; errors: number; date: string; time: number; total: number };
                const acc = record.total > 0 ? Math.round(((record.total - record.errors) / record.total) * 100) : 100;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-slate-300/20 text-slate-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-bold">{record.wpm} WPM</span>
                    <span className="text-muted-foreground/60">准确 {acc}%</span>
                    <span className="text-muted-foreground text-xs ml-auto">{record.date}</span>
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