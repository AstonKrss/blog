"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Play, Pause } from "lucide-react";

const CELL = 20;
const COLS = 20;
const ROWS = 16;
const INITIAL_SPEED = 120;

const CODE_SYMBOLS = [
  "🐍", "🐍", "🔥", "⚡", "💀", "🚀",
  "⚔️", "🎮", "⌨️", "💾",
];

interface Cell { x: number; y: number }

export function SnakeGame() {
  const [snake, setSnake] = useState<Cell[]>([{ x: 10, y: 8 }]);
  const [dir, setDir] = useState<"up" | "down" | "left" | "right">("right");
  const [food, setFood] = useState<Cell>({ x: 5, y: 5 });
  const [gameState, setGameState] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("snakeBest") || "0"));
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);

  const spawnFood = useCallback((s: Cell[]) => {
    let pos: Cell;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (s.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }, []);

  const init = useCallback(() => {
    setSnake([{ x: 10, y: 8 }]);
    setDir("right");
    setFood({ x: 5, y: 5 });
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameState("idle");
  }, []);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (gameState !== "playing") return;
    gameLoopRef.current = setInterval(() => {
      setSnake(prev => {
        const head = prev[0];
        const nd = dirRef.current;
        const newHead: Cell = {
          x: head.x + (nd === "right" ? 1 : nd === "left" ? -1 : 0),
          y: head.y + (nd === "down" ? 1 : nd === "up" ? -1 : 0),
        };
        // Wall collision
        if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
          setGameState("over");
          return prev;
        }
        // Self collision
        if (prev.some(s => s.x === newHead.x && s.y === newHead.y)) {
          setGameState("over");
          return prev;
        }
        const ateFood = newHead.x === food.x && newHead.y === food.y;
        if (ateFood) {
          setScore(s => {
            const ns = s + 10;
            if (ns > best) {
              setBest(ns);
              localStorage.setItem("snakeBest", String(ns));
            }
            return ns;
          });
          setSpeed(s => Math.max(50, s - 1));
          setFood(spawnFood(prev));
          return [newHead, ...prev];
        }
        return [newHead, ...prev.slice(0, -1)];
      });
    }, speed);
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [gameState, speed, food, spawnFood, best]);

  useEffect(() => {
    if (gameState === "over") {
      if (score > best) {
        setBest(score);
        localStorage.setItem("snakeBest", String(score));
      }
    }
  }, [gameState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const nd = map[e.key];
      if (!nd) return;
      e.preventDefault();
      const opposite = { up: "down", down: "up", left: "right", right: "left" };
      if (nd !== opposite[dirRef.current]) setDir(nd);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState]);

  const start = () => { setGameState("playing"); };

  // Focus container on start
  useEffect(() => {
    if (gameState === "playing") containerRef.current?.focus();
  }, [gameState]);

  const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
  const foodEmoji = CODE_SYMBOLS[Math.floor(Math.random() * CODE_SYMBOLS.length)];

  return (
    <div className="space-y-4">
      {/* Stats */}
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
        <button
          onClick={() => { init(); }}
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all shadow-sm"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </button>
      </div>

      {/* Game canvas */}
      <div
        ref={containerRef}
        tabIndex={0}
        className="relative rounded-2xl overflow-hidden bg-[#0f0e17] border border-[#2d2b42] outline-none"
        style={{ width: COLS * CELL, height: ROWS * CELL }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        />

        {/* Food */}
        <div
          className="absolute text-lg select-none"
          style={{
            left: food.x * CELL,
            top: food.y * CELL,
            width: CELL,
            height: CELL,
            lineHeight: `${CELL}px`,
            textAlign: "center",
          }}
        >
          {foodEmoji}
        </div>

        {/* Snake */}
        {snake.map((cell, i) => (
          <div
            key={i}
            className="absolute rounded-sm transition-all duration-[40ms]"
            style={{
              left: cell.x * CELL + 1,
              top: cell.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
              background: i === 0
                ? "linear-gradient(135deg, #ec4899, #f97316)"
                : i < snake.length / 2
                ? "linear-gradient(135deg, #ec4899, #be185d)"
                : "linear-gradient(135deg, #be185d, #9d174d)",
              opacity: 1 - i * 0.015,
            }}
          />
        ))}

        {/* Overlay */}
        {gameState !== "playing" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
            {gameState === "over" ? (
              <>
                <div className="text-2xl">💀</div>
                <div className="text-white font-bold text-lg">游戏结束</div>
                <div className="text-muted-foreground text-sm">得分: {score}</div>
                <button
                  onClick={() => { init(); setGameState("idle"); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  再来一局
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl">🐍</div>
                <div className="text-white font-bold">贪吃蛇</div>
                <div className="text-muted-foreground text-xs text-center px-4">
                  方向键/WASD 移动<br />空格键开始/暂停
                </div>
                <button
                  onClick={start}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <Play className="h-4 w-4" />
                  开始
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-muted-foreground">
        方向键 / WASD 移动 · 空格键暂停
      </div>
    </div>
  );
}
