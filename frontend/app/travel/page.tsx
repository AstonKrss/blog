"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MapPin, Plane } from "lucide-react";

interface VisitedCity {
  id: number;
  name: string;
  country: string;
  lat: number;
  lng: number;
  date: string;
  notes?: string;
}

const DEFAULT_CITIES: VisitedCity[] = [
  { id: 1, name: "广州", country: "中国", lat: 23.1291, lng: 113.2644, date: "2023-08", notes: "美食之城" },
  { id: 2, name: "深圳", country: "中国", lat: 22.5431, lng: 114.0579, date: "2023-10", notes: "科技之都" },
  { id: 3, name: "北京", country: "中国", lat: 39.9042, lng: 116.4074, date: "2024-01", notes: "首都" },
  { id: 4, name: "上海", country: "中国", lat: 31.2304, lng: 121.4737, date: "2024-03", notes: "魔都" },
  { id: 5, name: "杭州", country: "中国", lat: 30.2741, lng: 120.1551, date: "2024-05", notes: "西湖" },
  { id: 6, name: "成都", country: "中国", lat: 30.5728, lng: 104.0668, date: "2024-07", notes: "美食天堂" },
];

const chinaMapPoints = [
  { cx: 75, cy: 45, city: "北京", color: "#3b82f6" },
  { cx: 85, cy: 55, city: "上海", color: "#3b82f6" },
  { cx: 60, cy: 80, city: "广州", color: "#3b82f6" },
  { cx: 65, cy: 75, city: "深圳", color: "#3b82f6" },
  { cx: 45, cy: 70, city: "成都", color: "#3b82f6" },
  { cx: 90, cy: 50, city: "杭州", color: "#3b82f6" },
  { cx: 75, cy: 35, city: "西安", color: "#3b82f6" },
  { cx: 100, cy: 55, city: "南京", color: "#3b82f6" },
  { cx: 55, cy: 85, city: "香港", color: "#3b82f6" },
  { cx: 58, cy: 88, city: "澳门", color: "#3b82f6" },
];

const worldMapPoints = [
  { cx: 120, cy: 55, city: "北京", color: "#3b82f6" },
  { cx: 135, cy: 65, city: "上海", color: "#3b82f6" },
  { cx: 95, cy: 85, city: "广州", color: "#3b82f6" },
  { cx: 100, cy: 80, city: "深圳", color: "#3b82f6" },
  { cx: 75, cy: 75, city: "成都", color: "#3b82f6" },
  { cx: 140, cy: 60, city: "东京", color: "#f59e0b" },
  { cx: 155, cy: 70, city: "首尔", color: "#f59e0b" },
  { cx: 180, cy: 85, city: "新加坡", color: "#f97316" },
  { cx: 40, cy: 55, city: "伦敦", color: "#8b5cf6" },
  { cx: 35, cy: 50, city: "巴黎", color: "#8b5cf6" },
  { cx: 30, cy: 45, city: "柏林", color: "#8b5cf6" },
  { cx: 220, cy: 130, city: "悉尼", color: "#10b981" },
  { cx: 85, cy: 85, city: "纽约", color: "#ec4899" },
  { cx: 70, cy: 95, city: "洛杉矶", color: "#ec4899" },
];

export default function TravelMapPage() {
  const [cities] = useState<VisitedCity[]>(DEFAULT_CITIES);
  const [selectedCity, setSelectedCity] = useState<VisitedCity | null>(null);
  const [isChinaView, setIsChinaView] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const points = isChinaView ? chinaMapPoints : worldMapPoints;

  const handleCityClick = (cityName: string) => {
    const city = cities.find(c => c.name === cityName);
    if (city) setSelectedCity(city);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
            <div className="animate-float absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" style={{ animationDelay: "2s" }} />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <Plane className="h-8 w-8 text-white" />
              </div>
              <h1 className="mb-3 text-4xl font-bold">
                <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">旅行地图</span>
              </h1>
              <p className="text-muted-foreground">记录足迹，点亮城市</p>
            </div>

            <div className="mb-6 flex justify-center gap-4">
              <button
                onClick={() => setIsChinaView(true)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isChinaView
                    ? "bg-blue-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                🇨🇳 中国
              </button>
              <button
                onClick={() => setIsChinaView(false)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !isChinaView
                    ? "bg-blue-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                🌍 世界
              </button>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl border border-slate-800">
              <svg
                viewBox={isChinaView ? "0 0 140 110" : "0 0 250 150"}
                className="w-full h-auto"
                style={{ minHeight: "400px" }}
              >
                <defs>
                  <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e3a5f" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {isChinaView && (
                  <g>
                    <ellipse cx="70" cy="55" rx="55" ry="40" fill="#1e293b" opacity="0.6" />
                    <ellipse cx="70" cy="55" rx="50" ry="35" fill="url(#mapGradient)" opacity="0.4" />
                    <path d="M40,45 Q50,35 70,40 T100,45 T115,55 T100,70 T70,75 T40,70 T25,55 Z" fill="#1e293b" opacity="0.5" />
                  </g>
                )}

                {!isChinaView && (
                  <g>
                    <rect x="0" y="0" width="250" height="150" fill="url(#mapGradient)" opacity="0.3" rx="5" />
                    <ellipse cx="70" cy="45" rx="25" ry="20" fill="#1e293b" opacity="0.5" />
                    <ellipse cx="120" cy="50" rx="20" ry="15" fill="#1e293b" opacity="0.5" />
                    <ellipse cx="180" cy="70" rx="15" ry="25" fill="#1e293b" opacity="0.5" />
                    <ellipse cx="200" cy="90" rx="20" ry="15" fill="#1e293b" opacity="0.5" />
                    <ellipse cx="45" cy="80" rx="15" ry="20" fill="#1e293b" opacity="0.5" />
                    <ellipse cx="180" cy="120" rx="25" ry="20" fill="#1e293b" opacity="0.5" />
                  </g>
                )}

                {points.map((point, i) => {
                  const isVisited = cities.some(c => c.name === point.city);
                  const isHovered = hoveredCity === point.city;
                  
                  return (
                    <g 
                      key={i}
                      onClick={() => handleCityClick(point.city)}
                      onMouseEnter={() => setHoveredCity(point.city)}
                      onMouseLeave={() => setHoveredCity(null)}
                      className="cursor-pointer"
                      style={{ opacity: isVisited ? 1 : 0.4 }}
                    >
                      <circle
                        cx={point.cx}
                        cy={point.cy}
                        r={isHovered ? 8 : 6}
                        fill={point.color}
                        filter="url(#glow)"
                        className="transition-all duration-300"
                      />
                      <circle
                        cx={point.cx}
                        cy={point.cy}
                        r={isHovered ? 15 : 10}
                        fill="transparent"
                        stroke={point.color}
                        strokeWidth="1"
                        opacity="0.5"
                        className="animate-ping"
                        style={{ animationDuration: "2s" }}
                      />
                      <text
                        x={point.cx}
                        y={point.cy - 12}
                        fill="#94a3b8"
                        fontSize={isChinaView ? "4" : "3.5"}
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {point.city}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-4 left-4 text-xs text-slate-400">
                已访问 {cities.length} 个城市
              </div>
              <div className="absolute bottom-4 right-4 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-slate-400">中国</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-slate-400">日韩</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-slate-400">欧洲</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-pink-500" />
                  <span className="text-slate-400">北美</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">大洋洲</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <div
                  key={city.id}
                  onClick={() => setSelectedCity(city)}
                  className="group cursor-pointer rounded-xl border bg-card p-4 transition-all hover:border-blue-500 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{city.name}</h3>
                        <p className="text-sm text-muted-foreground">{city.country}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{city.date}</span>
                  </div>
                  {city.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{city.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {selectedCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedCity(null)}>
          <div
            className="mx-4 max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCity.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCity.country}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="rounded-full p-2 hover:bg-muted"
              >
                ×
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span>访问时间: {selectedCity.date}</span>
              </div>
              {selectedCity.notes && (
                <p className="text-sm text-muted-foreground">{selectedCity.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}