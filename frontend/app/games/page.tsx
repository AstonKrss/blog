"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Game2048 } from "@/components/games/game-2048";
import { SnakeGame } from "@/components/games/snake-game";
import { TypingRunner } from "@/components/games/typing-runner";
import { PasswordStrengthGame } from "@/components/games/password-game";
import { TypeSpeedTest } from "@/components/games/type-speed-test";
import { GitmojiGenerator } from "@/components/games/gitmoji-generator";
import { RetroConsole } from "@/components/games/retro-console";
import { DailyQuestion } from "@/components/games/daily-question";
import { MessageWall } from "@/components/games/message-wall";
import {
  Gamepad2, ArrowLeft, Keyboard, Grid3x3, Joystick,
  Type, Lock, Brain, Terminal, GitBranch, MessageSquare, Calendar
} from "lucide-react";

const games = [
  {
    id: "typing-speed",
    name: "打字测速",
    desc: "测试你的打字速度",
    icon: Keyboard,
    gradient: "from-rose-500 to-pink-500",
    component: <TypeSpeedTest />,
  },
  {
    id: "typing-runner",
    name: "打字跑酷",
    desc: "打字速度跑酷挑战",
    icon: Type,
    gradient: "from-orange-500 to-amber-500",
    component: <TypingRunner />,
  },
  {
    id: "game-2048",
    name: "2048",
    desc: "数字合并游戏",
    icon: Grid3x3,
    gradient: "from-emerald-500 to-teal-500",
    component: <Game2048 />,
  },
  {
    id: "snake",
    name: "贪吃蛇",
    desc: "经典贪吃蛇",
    icon: Joystick,
    gradient: "from-cyan-500 to-blue-500",
    component: <SnakeGame />,
  },
  {
    id: "password-game",
    name: "密码闯关",
    desc: "密码强度挑战",
    icon: Lock,
    gradient: "from-violet-500 to-purple-600",
    component: <PasswordStrengthGame />,
  },
  {
    id: "daily-question",
    name: "每日一题",
    desc: "每日技术问答",
    icon: Brain,
    gradient: "from-pink-500 to-rose-500",
    component: <DailyQuestion />,
  },
  {
    id: "retro-console",
    name: "小霸王",
    desc: "经典游戏合集",
    icon: Terminal,
    gradient: "from-gray-600 to-gray-800",
    component: <RetroConsole />,
  },
  {
    id: "gitmoji",
    name: "Gitmoji",
    desc: "Gitmoji 生成器",
    icon: GitBranch,
    gradient: "from-orange-500 to-red-500",
    component: <GitmojiGenerator />,
  },
  {
    id: "message-wall",
    name: "留言墙",
    desc: "访客留言板",
    icon: MessageSquare,
    gradient: "from-amber-500 to-yellow-500",
    component: <MessageWall />,
  },
];

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<typeof games[0] | null>(null);

  const GameIcon = activeGame?.icon || Gamepad2;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-pink-500/8 blur-[80px]" />
        </div>

        <div className="relative w-full px-4 py-10">
          {activeGame ? (
            <div className="max-w-4xl animate-fade-in-up">
              <button onClick={() => setActiveGame(null)} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all group">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                返回游戏列表
              </button>
              <div className="rounded-2xl glass-card overflow-hidden shadow-xl">
                <div className={`h-1 bg-gradient-to-r ${activeGame.gradient}`} />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${activeGame.gradient} shadow-lg`}>
                      <activeGame.icon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-black">{activeGame.name}</h2>
                  </div>
                  {activeGame.component}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-8">
              {/* Left sidebar */}
              <aside className="w-48 shrink-0">
                <div className="rounded-2xl glass-card p-4 sticky top-24 space-y-1">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md">
                    <Gamepad2 className="h-4 w-4" />
                    <span className="text-sm font-bold">趣味游戏</span>
                  </div>
                  {games.map(game => {
                    const Icon = game.icon;
                    return (
                      <button key={game.id} onClick={() => setActiveGame(game)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <Icon className="h-4 w-4 shrink-0" />
                        {game.name}
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Right — grid */}
              <div className="flex-1 min-w-0">
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg">
                    <Gamepad2 className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-black">趣味游戏</h1>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {games.map(game => {
                    const Icon = game.icon;
                    return (
                      <button key={game.id}
                        onClick={() => setActiveGame(game)}
                        className="group relative overflow-hidden rounded-2xl glass-card p-6 text-left transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl border border-transparent hover:border-rose-500/20">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${game.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                        <div className={`relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${game.gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="relative mb-2 text-base font-bold group-hover:text-rose-400 transition-colors">{game.name}</h3>
                        <p className="relative text-sm text-muted-foreground">{game.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}