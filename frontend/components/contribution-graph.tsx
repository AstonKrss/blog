"use client";

import { useState } from "react";

// Generate mock contribution data for the past year
function generateContributionData() {
  const data: Record<string, number> = {};
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    // Random activity with some patterns
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;
    const base = isWeekday ? 3 : 1;
    data[key] = Math.floor(Math.random() * 5) + base + Math.floor(Math.random() * 3);
  }
  return data;
}

function getContributionLevel(count: number) {
  if (count === 0) return "bg-muted/30";
  if (count <= 2) return "bg-rose-500/20";
  if (count <= 4) return "bg-rose-500/40";
  if (count <= 6) return "bg-rose-500/60";
  return "bg-rose-500";
}

function getTooltipText(dateStr: string, count: number) {
  const date = new Date(dateStr);
  const formatted = date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  return `${formatted}: ${count} 次活动`;
}

export function ContributionGraph() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const data = generateContributionData();
  const today = new Date();

  // Get all dates for the past year
  const dates: string[] = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }

  // Group by week (columns)
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  dates.forEach((date, i) => {
    currentWeek.push(date);
    if (currentWeek.length === 7 || i === dates.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Month labels
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const monthPositions: { label: string; index: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    if (week.length > 0) {
      const month = new Date(week[0]).getMonth();
      if (month !== lastMonth) {
        monthPositions.push({ label: months[month], index: i });
        lastMonth = month;
      }
    }
  });

  const totalContributions = Object.values(data).reduce((a, b) => a + b, 0);
  const maxStreak = calculateMaxStreak(data);

  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-400">
            <svg className="h-4 w-4 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25ZM1.75 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25ZM4.5 3.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75ZM3.75 8a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM4.5 12.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </div>
          贡献图
        </h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{totalContributions} 次活动</span>
          <span>最长连续 {maxStreak} 天</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="relative mb-2 ml-8">
        {monthPositions.map((m) => (
          <span
            key={m.label}
            className="absolute text-xs text-muted-foreground"
            style={{ left: `${m.index * 14}px` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Graph */}
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        <div className="flex flex-col gap-[3px] mr-1">
          {["日", "一", "二", "三", "四", "五", "六"].map((day, i) => (
            <div key={i} className="h-[11px] text-[9px] text-muted-foreground leading-[11px] text-right pr-1">
              {i % 2 === 1 ? day : ""}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-[3px]">
            {week.map((date, dayIndex) => {
              const count = data[date] || 0;
              return (
                <div
                  key={date}
                  className={`w-[11px] h-[11px] rounded-sm ${getContributionLevel(count)} cursor-pointer transition-all hover:scale-150 hover:z-10`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      text: getTooltipText(date, count),
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
            {/* Fill empty cells */}
            {Array.from({ length: 7 - week.length }).map((_, i) => (
              <div key={`empty-${weekIndex}-${i}`} className="w-[11px] h-[11px]" />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3 text-xs text-muted-foreground">
        <span>少</span>
        {[0, 2, 4, 6, 8].map((level) => (
          <div key={level} className={`w-[11px] h-[11px] rounded-sm ${getContributionLevel(level)}`} />
        ))}
        <span>多</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function calculateMaxStreak(data: Record<string, number>): number {
  let maxStreak = 0;
  let currentStreak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    if (data[key] && data[key] > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}
