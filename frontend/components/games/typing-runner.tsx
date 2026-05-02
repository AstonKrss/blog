"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Trophy, Zap, Keyboard } from "lucide-react";

const WORDS = [
  "const", "async", "await", "import", "export", "return", "function",
  "class", "render", "state", "effect", "fetch", "parse", "string",
  "array", "object", "promise", "callback", "module", "component",
  "docker", "nginx", "linux", "jenkins", "git", "ci", "cd", "k8s",
  "spring", "react", "next", "node", "java", "python", "rust", "go",
  "typescript", "tailwind", "vite", "webpack", "vite", "api", "rest",
];

interface FlyingWord {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  typed: boolean;
}

function buildWord(): FlyingWord {
  return {
    id: Math.random(),
    word: WORDS[Math.floor(Math.random() * WORDS.length)],
    x: 100,
    y: 80 + Math.random() * 300,
    speed: 0.3 + Math.random() * 0.4,
    typed: false,
  };
}

export function TypingRunner() {
  const [playing, setPlaying] = useState(false);
  const [words, setWords] = useState<FlyingWord[]>([]);
  const [score, setScore] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [input, setInput] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("typingRunnerBest") || "0"));
  const [totalTyped, setTotalTyped] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<number>(0);

  const init = useCallback(() => {
    setPlaying(false);
    setWords([]);
    setScore(0);
    setWpm(0);
    setCombo(0);
    setLevel(1);
    setInput("");
    setGameOver(false);
    setStartTime(0);
    setTotalTyped(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { init(); }, [init]);

  // Game loop
  useEffect(() => {
    if (!playing) return;

    if (startTime === 0) setStartTime(Date.now());

    const loop = () => {
      setWords(prev => {
        // Remove typed/offscreen words
        let next = prev.filter(w => !w.typed && w.x > -20);

        // Spawn new words based on level
        const maxWords = Math.min(8, 3 + level);
        if (next.length < maxWords && Math.random() < 0.04 + level * 0.005) {
          next = [...next, buildWord()];
        }

        // Move words
        next = next.map(w => ({ ...w, x: w.x - w.speed }));

        // Check if any word reached left edge (lose)
        const lost = next.some(w => !w.typed && w.x <= 0);
        if (lost) {
          setPlaying(false);
          setGameOver(true);
          return next;
        }
        return next;
      });

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, level, startTime]);

  // WPM tracking
  useEffect(() => {
    if (!playing || totalTyped === 0) return;
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    if (elapsed > 0) setWpm(Math.round(totalTyped / 5 / elapsed));
  }, [totalTyped, playing, startTime]);

  // Combo → level
  useEffect(() => {
    const newLevel = Math.floor(combo / 5) + 1;
    if (newLevel !== level) setLevel(newLevel);
  }, [combo]);

  useEffect(() => {
    if (gameOver) {
      if (score > best) {
        setBest(score);
        localStorage.setItem("typingRunnerBest", String(score));
      }
    }
  }, [gameOver]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().trim();
    setInput(val);

    if (!val) return;

    setWords(prev => {
      const matchIdx = prev.findIndex(w => !w.typed && w.word.toLowerCase().startsWith(val));
      if (matchIdx !== -1) {
        const match = prev[matchIdx];
        if (match.word.toLowerCase() === val) {
          // Full match — destroy word
          setScore(s => s + 10 * (1 + combo * 0.1));
          setCombo(c => c + 1);
          setTotalTyped(t => t + 1);
          setInput("");
          return prev.map((w, i) => i === matchIdx ? { ...w, typed: true } : w);
        }
      }
      return prev;
    });
  };

  const start = () => { init(); setPlaying(true); };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "得分", value: score, color: "from-rose-500 to-pink-500" },
          { label: "速度", value: `${wpm} WPM`, color: "from-orange-500 to-amber-500", isText: true },
          { label: "连击", value: combo, color: "from-yellow-500 to-orange-400" },
          { label: "关卡", value: level, color: "from-emerald-500 to-teal-500" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl glass-card p-3 text-center bg-gradient-to-br ${stat.color}/10`}>
            {stat.isText ? (
              <div className="text-lg font-black">{stat.value}</div>
            ) : (
              <>
                <div className="text-lg font-black">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Game field */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0f0e17] border border-[#2d2b42]" style={{ height: 420 }}>
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Animated track lines */}
        <div
          className="absolute bottom-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent"
          style={{ bottom: 40 }}
        />

        {/* Flying words */}
        {words.map(w => (
          <div
            key={w.id}
            className={`absolute text-sm font-mono font-bold select-none transition-opacity duration-300 ${
              w.typed ? "opacity-0 scale-150 text-green-400" : "text-white"
            }`}
            style={{
              left: w.x,
              top: w.y,
              textShadow: w.typed ? "0 0 8px #22c55e" : "0 0 10px rgba(255,255,255,0.3)",
            }}
          >
            {w.word}
          </div>
        ))}

        {/* Start overlay */}
        {!playing && !gameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
            <div className="text-4xl">⚡</div>
            <div className="text-white font-bold text-lg">打字跑酷</div>
            <div className="text-muted-foreground text-xs text-center px-4">
              输入飞来的单词消灭它们<br />连击越多分数越高
            </div>
            <button
              onClick={start}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
            >
              <Zap className="h-4 w-4" />
              开始游戏
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
            <div className="text-3xl">💀</div>
            <div className="text-white font-bold text-lg">游戏结束</div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-black text-rose-400">{score} 分</div>
              <div className="text-muted-foreground text-xs">{wpm} WPM · 连击 x{combo}</div>
            </div>
            <button
              onClick={start}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
            >
              <RotateCcw className="h-4 w-4" />
              再来一局
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          disabled={!playing}
          placeholder={playing ? "输入单词..." : "按开始游戏后输入..."}
          className="w-full rounded-xl border border-border/50 bg-card pl-12 pr-4 py-3.5 text-base font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all shadow-sm disabled:opacity-50"
        />
        <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {/* Best score */}
      {best > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-3 w-3 text-yellow-500" />
          最高分: {best}
        </div>
      )}
    </div>
  );
}
