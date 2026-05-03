"use client";

import { useState, useEffect, useRef } from "react";
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
  const PADDLE_W = 60;
  const PADDLE_H = 4;
  const BALL_R = 4;
  const PADDLE_Y = 268;
  const keysHeld = useRef<Set<string>>(new Set());
  const [paddle, setPaddle] = useState(110); // center x

  useEffect(() => {
    const update = () => {
      if (keysHeld.current.has("ArrowLeft")) {
        setPaddle(p => Math.max(PADDLE_W / 2, p - 12));
      }
      if (keysHeld.current.has("ArrowRight")) {
        setPaddle(p => Math.min(W - PADDLE_W / 2, p + 12));
      }
    };
    const id = setInterval(update, 20);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        keysHeld.current.add(e.key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.current.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  const [ball, setBall] = useState({ x: 140, y: 200, vx: 1.5, vy: -1.5 });
  const bricksRef = useRef(
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => ({ r, c, hit: false }))
    )
  );
  type Brick = { r: number; c: number; hit: boolean };
  const [bricksRender, setBricksRender] = useState<Brick[][]>(bricksRef.current as Brick[][]);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const W = 280;
  const H = 280;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paddleRef = useRef(paddle);
  paddleRef.current = paddle;

  const start = () => {
    bricksRef.current = Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => ({ r, c, hit: false }))
    );
    setBricksRender([...bricksRef.current]);
    setPlaying(true);
    setBall({ x: W / 2, y: 200, vx: 1.5, vy: -1.5 });
    setOver(false);
    setWon(false);
    setScore(0);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setBall(prev => {
        let { x, y, vx, vy } = prev;
        x += vx;
        y += vy;

        // Left/right walls
        if (x - BALL_R <= 0) { x = BALL_R; vx = Math.abs(vx); }
        if (x + BALL_R >= W) { x = W - BALL_R; vx = -Math.abs(vx); }
        // Top wall
        if (y - BALL_R <= 0) { y = BALL_R; vy = Math.abs(vy); }

        // Bottom — game over
        if (y >= H + BALL_R) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimeout(() => { setOver(true); setPlaying(false); }, 0);
          return prev;
        }

        // Paddle collision
        if (
          y + BALL_R >= PADDLE_Y &&
          y - BALL_R <= PADDLE_Y + PADDLE_H &&
          x + BALL_R >= paddleRef.current - PADDLE_W / 2 &&
          x - BALL_R <= paddleRef.current + PADDLE_W / 2 &&
          vy > 0
        ) {
          y = PADDLE_Y - BALL_R;
          vy = -Math.abs(vy);
          // Angle based on hit position
          const hitPos = (x - paddleRef.current) / (PADDLE_W / 2); // -1 to 1
          vx = hitPos * 2.5;
        }

        // Brick collision — flatten 2D array for iteration
        const brickW = W / 6;
        const brickH = 14;
        const flatBricks = bricksRef.current.flat();
        let allHit = true;
        let hitBrick = false;
        for (let i = 0; i < flatBricks.length; i++) {
          const b = flatBricks[i];
          if (b.hit) continue;
          allHit = false;
          const bx = b.c * brickW;
          const by = b.r * brickH + 8;
          if (
            x + BALL_R >= bx + 1 &&
            x - BALL_R <= bx + brickW - 1 &&
            y + BALL_R >= by &&
            y - BALL_R <= by + brickH
          ) {
            flatBricks[i].hit = true;
            hitBrick = true;
            setBricksRender([...bricksRef.current]);
            setScore(s => s + 10);
            // Bounce: vertical if hit top/bottom, horizontal if hit side
            const fromTop = y - BALL_R <= by;
            const fromBottom = y + BALL_R >= by + brickH;
            const fromLeft = x - BALL_R <= bx + 1;
            const fromRight = x + BALL_R >= bx + brickW - 1;
            if ((fromTop || fromBottom) && !fromLeft && !fromRight) {
              vy = -vy;
            } else {
              vx = -vx;
            }
            break;
          }
        }

        if (!allHit && !hitBrick) {
          // continue
        } else if (allHit && !won) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setTimeout(() => { setWon(true); setPlaying(false); }, 0);
        }

        return { x, y, vx, vy };
      });
    }, 20);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
        {bricksRender.flat().map((b, i) => {
          const brickW = W / 6;
          const brickH = 14;
          return !b.hit && (
            <div
              key={i}
              className="absolute rounded-sm"
              style={{
                left: b.c * brickW + 1,
                top: b.r * brickH + 8,
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
          className="absolute rounded-full bg-white shadow-lg shadow-white/50"
          style={{
            left: ball.x - BALL_R,
            top: ball.y - BALL_R,
            width: BALL_R * 2,
            height: BALL_R * 2,
          }}
        />
        {/* Paddle */}
        <div
          className="absolute h-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-500/50"
          style={{
            left: paddle - PADDLE_W / 2,
            top: PADDLE_Y,
            width: PADDLE_W,
          }}
        />
        {/* Game over / win */}
        {(over || won) && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
            <div className="text-2xl">{won ? "🏆" : "💀"}</div>
            <div className="text-white font-bold">{won ? "通关！" : "失败"}</div>
          </div>
        )}
      </div>
      <div className="text-center text-xs text-muted-foreground">← → 移动挡板 · 击破所有砖块</div>
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
