"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw, Trophy } from "lucide-react";

const TILES = [
  { value: 0, label: "", color: "bg-[#3d3a4e]" },
  { value: 2, label: "Docker", color: "bg-[#2496ed] text-white", bgVar: "#2496ed" },
  { value: 4, label: "Nginx", color: "bg-[#009639] text-white", bgVar: "#009639" },
  { value: 8, label: "Linux", color: "bg-[#fcc624] text-black", bgVar: "#fcc624" },
  { value: 16, label: "Git", color: "bg-[#f05032] text-white", bgVar: "#f05032" },
  { value: 32, label: "Java", color: "bg-[#ed8b00] text-white", bgVar: "#ed8b00" },
  { value: 64, label: "Spring", color: "bg-[#6db33f] text-white", bgVar: "#6db33f" },
  { value: 128, label: "React", color: "bg-[#61dafb] text-black", bgVar: "#61dafb" },
  { value: 256, label: "Next", color: "bg-[#000] text-white", bgVar: "#000000" },
  { value: 512, label: "K8s", color: "bg-[#326ce5] text-white", bgVar: "#326ce5" },
  { value: 1024, label: "CI/CD", color: "bg-[#ff4757] text-white", bgVar: "#ff4757" },
  { value: 2048, label: "DevOps", color: "bg-gradient-to-br from-rose-500 to-pink-500 text-white", bgVar: "transparent" },
];

type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((_, c) => { if (!grid[r][c]) empty.push([r, c]); }));
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function rotate(grid: Grid): Grid {
  const n = grid.length;
  const rotated: Grid = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      rotated[c][n - 1 - r] = grid[r][c];
  return rotated;
}

function slideRow(row: number[]): { row: number[]; score: number; merged: boolean[] } {
  const filtered = row.filter(v => v !== 0);
  let score = 0;
  const merged: boolean[] = [];
  const newRow: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      newRow.push(filtered[i] * 2);
      merged.push(true);
      score += filtered[i] * 2;
      i++;
    } else {
      newRow.push(filtered[i]);
      merged.push(false);
    }
  }
  while (newRow.length < 4) newRow.push(0);
  return { row: newRow, score, merged };
}

function move(grid: Grid, dir: "up" | "down" | "left" | "right"): { grid: Grid; score: number; moved: boolean } {
  let g = grid.map(r => [...r]);
  let totalScore = 0;
  let moved = false;

  const rotations = { left: 0, right: 2, up: 1, down: 3 };
  for (let i = 0; i < rotations[dir]; i++) g = rotate(g);

  g = g.map(row => {
    const { row: nr } = slideRow(row);
    return nr;
  });

  for (let i = 0; i < (4 - rotations[dir]); i++) g = rotate(g);

  // Check if moved
  g.forEach((row, r) => row.forEach((v, c) => { if (v !== grid[r][c]) moved = true; }));

  return { grid: g, score: totalScore, moved };
}

function Game2048() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("2048Best") || "0"));
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);

  const init = useCallback(() => {
    let g = emptyGrid();
    g = addTile(g);
    g = addTile(g);
    setGrid(g);
    setScore(0);
    setWon(false);
    setOver(false);
  }, []);

  useEffect(() => { init(); }, [init]);

  const handleMove = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (over) return;
    const { grid: newGrid, moved } = move(grid, dir);
    if (!moved) return;
    const finalGrid = addTile(newGrid);
    setGrid(finalGrid);
    // Check win
    let has2048 = false;
    let hasEmpty = false;
    finalGrid.forEach(row => row.forEach(v => {
      if (v === 2048) has2048 = true;
      if (v === 0) hasEmpty = true;
    }));
    if (has2048 && !won) setWon(true);

    // Check game over
    const { grid: testLeft } = move(finalGrid, "left");
    const { grid: testRight } = move(finalGrid, "right");
    const { grid: testUp } = move(finalGrid, "up");
    const { grid: testDown } = move(finalGrid, "down");
    const sameLeft = JSON.stringify(testLeft) === JSON.stringify(finalGrid);
    const sameRight = JSON.stringify(testRight) === JSON.stringify(finalGrid);
    const sameUp = JSON.stringify(testUp) === JSON.stringify(finalGrid);
    const sameDown = JSON.stringify(testDown) === JSON.stringify(finalGrid);
    if (sameLeft && sameRight && sameUp && sameDown) setOver(true);
  }, [grid, over, won]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      if (map[e.key]) { e.preventDefault(); handleMove(map[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  // Swipe support
  const touchStart = useRef<{ x: number; y: number } | null>(null);  const getTileStyle = (value: number) => {
    const tile = TILES.find(t => t.value === value) || TILES[0];
    return {
      label: value === 0 ? "" : (value >= 2048 ? "DevOps" : tile.label),
      bg: value === 0 ? "#3d3a4e" : value === 2048 ? "linear-gradient(135deg, #ec4899, #f97316)" : tile.bgVar,
      color: value === 0 ? "" : "text-white",
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="rounded-xl glass-card p-3 text-center">
            <div className="text-xs text-muted-foreground">当前</div>
            <div className="text-xl font-black">{score}</div>
          </div>
          <div className="rounded-xl glass-card p-3 text-center">
            <div className="text-xs text-muted-foreground">最高</div>
            <div className="text-xl font-black text-yellow-500">{best}</div>
          </div>
        </div>
        <button onClick={init} className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-all shadow-sm">
          <RotateCcw className="h-4 w-4" />
          重置
        </button>
      </div>

      {/* Win overlay */}
      {won && !over && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/30 p-4 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-bold text-rose-500">恭喜达到 DevOps！</span>
          </div>
          <p className="text-xs text-muted-foreground">你可以继续玩争取更高分</p>
        </div>
      )}

      {/* Game over */}
      {over && (
        <div className="rounded-2xl glass-card p-4 text-center animate-fade-in">
          <p className="font-bold mb-2">游戏结束</p>
          <p className="text-xs text-muted-foreground mb-3">得分: {score}</p>
          <button onClick={init} className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5">
            再来一局
          </button>
        </div>
      )}

      {/* Grid */}
      <div
        className="grid grid-cols-4 gap-2 rounded-2xl p-4 bg-[#1a1625]"
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - touchStart.current.x;
          const dy = t.clientY - touchStart.current.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          if (Math.max(absDx, absDy) < 30) return;
          if (absDx > absDy) handleMove(dx > 0 ? "right" : "left");
          else handleMove(dy > 0 ? "down" : "up");
        }}
      >
        {grid.flat().map((val, i) => {
          const style = getTileStyle(val);
          return (
            <div
              key={i}
              className="aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-200"
              style={{
                background: style.bg,
                color: style.color,
                fontSize: val > 1024 ? "9px" : val > 128 ? "10px" : "12px",
              }}
            >
              {style.label}
            </div>
          );
        })}
      </div>

      {/* Controls hint */}
      <div className="text-center text-xs text-muted-foreground">
        键盘方向键或 WASD 移动 · 手机可滑动
      </div>
    </div>
  );
}

export { Game2048 };
