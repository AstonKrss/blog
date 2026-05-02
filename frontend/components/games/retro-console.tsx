"use client";

import { useState, useEffect } from "react";
import { Gamepad2, Play, RotateCcw } from "lucide-react";

const GAMES = [
  {
    name: "俄罗斯方块",
    emoji: "🧱",
    component: "tetris",
    desc: "经典方块消除游戏",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    name: "2048",
    emoji: "🎮",
    component: "2048",
    desc: "数字合并挑战",
    gradient: "from-orange-500 to-amber-400",
  },
  {
    name: "贪吃蛇",
    emoji: "🐍",
    component: "snake",
    desc: "经典贪吃蛇",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "打字跑酷",
    emoji: "⚡",
    component: "runner",
    desc: "打字速度挑战",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    name: "记忆翻牌",
    emoji: "🃏",
    component: "memory",
    desc: "记忆力测试",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    name: "打砖块",
    emoji: "🏓",
    component: "breakout",
    desc: "弹球打砖块",
    gradient: "from-pink-500 to-rose-500",
  },
];

// ── Memory Card Game ──────────────────────────────────────────────────────────────
function MemoryGame() {
  const ICONS = ["🎮", "💻", "🔒", "🚀", "⚡", "🛡️", "🎯", "🌟"];
  const [cards, setCards] = useState(() => {
    const shuffled = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
    return shuffled.map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
  });
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const flip = (idx: number) => {
    if (cards[idx].flipped || cards[idx].matched || selected.length >= 2) return;
    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    setCards(newCards);
    const next = [...selected, idx];
    setSelected(next);

    if (next.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = next;
      if (cards[a].icon === cards[b].icon) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
          if (!newCards.every((c, i) => i === a || i === b ? c.matched : c.matched)) {
            // check win after match
          }
          setSelected([]);
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 700);
      }
    }
  };

  const reset = () => {
    const shuffled = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
    setCards(shuffled.map((icon, i) => ({ id: i, icon, flipped: false, matched: false })));
    setSelected([]);
    setMoves(0);
    setWon(false);
  };

  const allMatched = cards.every(c => c.matched);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-xl glass-card px-4 py-2 text-center">
          <div className="text-xs text-muted-foreground">步数</div>
          <div className="text-xl font-black">{moves}</div>
        </div>
        <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-all">
          <RotateCcw className="h-4 w-4" />
          重开
        </button>
      </div>
      {allMatched && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-4 text-center animate-fade-in">
          <div className="text-2xl mb-2">🏆</div>
          <div className="font-bold text-emerald-500">全部配对完成！</div>
          <div className="text-xs text-muted-foreground mt-1">用了 {moves} 步</div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => flip(i)}
            className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
              card.flipped || card.matched
                ? "bg-gradient-to-br from-rose-500/30 to-pink-500/30 border border-rose-500/30"
                : "glass-card hover:-translate-y-0.5"
            }`}
          >
            {card.flipped || card.matched ? card.icon : "❓"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Breakout ────────────────────────────────────────────────────────────────────
function BreakoutGame() {
  const [paddle, setPaddle] = useState(90);
  const [ball, setBall] = useState({ x: 50, y: 80, vx: 1, vy: -1 });
  const [bricks] = useState(() =>
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => ({ r, c, hit: false }))
    ).flat()
  );
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const W = 280;
  const H = 280;

  // Simple physics with setInterval
  const intervalRef = { current: null as ReturnType<typeof setInterval> | null }; // eslint-disable-line @typescript-eslint/no-explicit-any

  const start = () => {
    setPlaying(true);
    setBall({ x: W / 2, y: 80, vx: 1, vy: -1 });
    setOver(false);
    setWon(false);
    setScore(0);
    intervalRef.current = setInterval(() => {
      setBall(prev => {
        let { x, y, vx, vy } = prev;
        x += vx;
        y += vy;
        // Walls
        if (x <= 0 || x >= W) vx = -vx;
        if (y <= 0) vy = -vy;
        // Bottom — game over
        if (y >= H) {
          setOver(true);
          setPlaying(false);
          return prev;
        }
        // Paddle — simple 1D check
        if (y >= H - 20 && x >= paddle - 20 && x <= paddle + 60) vy = -vy;
        // Bricks
        const brickW = W / 6;
        const brickH = 16;
        bricks.forEach((b, i) => {
          if (b.hit) return;
          const bx = b.c * brickW;
          const by = b.r * brickH + 10;
          if (x >= bx && x <= bx + brickW && y >= by && y <= by + brickH) {
            vy = -vy;
            b.hit = true;
            setScore(s => s + 10);
            if (bricks.filter(bb => !bb.hit).length === 0) {
              setWon(true);
              setPlaying(false);
            }
          }
        });
        return { x, y, vx, vy };
      });
    }, 16);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setPaddle(p => Math.max(0, p - 10));
      if (e.key === "ArrowRight") setPaddle(p => Math.min(W - 60, p + 10));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="rounded-xl glass-card px-4 py-2 text-center">
          <div className="text-xs text-muted-foreground">得分</div>
          <div className="text-xl font-black">{score}</div>
        </div>
        <button onClick={playing ? undefined : start} className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50">
          {playing ? "游戏中" : "开始"}
        </button>
      </div>
      <div
        className="relative rounded-xl overflow-hidden bg-[#0f0e17] border border-[#2d2b42]"
        style={{ width: W, height: H }}
      >
        {/* Bricks */}
        {bricks.map((b, i) => {
          const brickW = W / 6;
          const brickH = 16;
          return !b.hit && (
            <div
              key={i}
              className="absolute rounded-sm"
              style={{
                left: b.c * brickW + 1,
                top: b.r * brickH + 10,
                width: brickW - 2,
                height: brickH,
                background: [
                  "from-rose-500 to-pink-500",
                  "from-orange-500 to-amber-400",
                  "from-yellow-500 to-orange-400",
                  "from-emerald-500 to-teal-500",
                  "from-cyan-500 to-blue-500",
                ][b.r],
              }}
            />
          );
        })}
        {/* Ball */}
        <div
          className="absolute w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50"
          style={{ left: ball.x - 6, top: ball.y - 6 }}
        />
        {/* Paddle */}
        <div
          className="absolute h-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 bottom-4"
          style={{ left: paddle, width: 60 }}
        />
        {/* Game over / win */}
        {(over || won) && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
            <div className="text-2xl">{won ? "🏆" : "💀"}</div>
            <div className="text-white font-bold">{won ? "通关！" : "失败"}</div>
          </div>
        )}
      </div>
      <div className="text-center text-xs text-muted-foreground">← → 移动挡板</div>
    </div>
  );
}

// ── Main Console ──────────────────────────────────────────────────────────────────────
export function RetroConsole() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {!activeGame ? (
        <>
          {/* Console header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 shadow-lg shadow-rose-500/30">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold">小霸王游戏机</h3>
              <p className="text-xs text-muted-foreground">经典怀旧游戏合集</p>
            </div>
          </div>

          {/* Game grid */}
          <div className="grid grid-cols-3 gap-3">
            {GAMES.map((game) => (
              <button
                key={game.component}
                onClick={() => setActiveGame(game.component)}
                className="group relative flex flex-col items-center gap-2 rounded-2xl glass-card p-5 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-[0.1] transition-opacity duration-500`} />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${game.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="text-3xl relative z-10 group-hover:scale-110 transition-transform duration-300">
                  {game.emoji}
                </div>
                <div className="text-xs font-medium text-center relative z-10 group-hover:text-foreground transition-colors">
                  {game.name}
                </div>
                <div className="text-[10px] text-muted-foreground text-center relative z-10">{game.desc}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Back button */}
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 rounded-xl glass-card px-4 py-2 text-sm font-medium hover:bg-muted transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            返回游戏列表
          </button>

          {/* Game content */}
          <div className="rounded-2xl glass-card p-6">
            {activeGame === "memory" && <MemoryGame />}
            {activeGame === "breakout" && <BreakoutGame />}
            {(activeGame === "2048" || activeGame === "snake" || activeGame === "runner") && (
              <div className="text-center text-muted-foreground py-12">
                请在工具箱页面体验完整游戏
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
