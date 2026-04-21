"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2, Trash2, MapPin, X } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import citiesData from "./cities.json";

declare global {
  interface Window {
    echarts: any;
  }
}

interface Footprint {
  id: string;
  userId?: string;
  province: string;
  city?: string;
  description?: string;
  createdAt?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function TravelMapPage() {
  const [chartElement, setChartElement] = useState<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [footprints, setFootprints] = useState<Footprint[]>([]);
  const { user, loading: authLoading } = useAuth();

  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const loadFootprintsPromise = () => {
    return new Promise<void>((resolve) => {
      fetch(`${API_BASE}/api/public/footprints`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 0 && data.data) {
            setFootprints(data.data.map((f: any) => ({
              id: f.id,
              province: f.province,
              city: f.city || null,
              description: f.description,
            })));
          }
        })
        .catch(err => console.error("Failed to load footprints:", err))
        .finally(() => resolve());
    });
  };

  const handleAddFootprint = async (province: string, city?: string) => {
    if (!user) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE}/api/footprints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ province, city: city || null, description }),
      });
      setShowCityModal(false);
      setSelectedProvince("");
      setDescription("");
      loadFootprintsPromise();
    } catch (err) {
      console.error("Failed to add footprint:", err);
    }
  };

  const handleDeleteFootprint = async (id: string) => {
    if (!confirm("确定删除这个足迹？")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/footprints/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFootprints(footprints.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const getVisitedProvinces = () => {
    const visited = new Set<string>();
    footprints.forEach(f => visited.add(f.province));
    return visited;
  };

  const initChart = async () => {
    if (!chartElement || !isMountedRef.current) return;

    try {
      if (!window.echarts) {
        await loadScript("https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js");
      }
      if (!isMountedRef.current) return;

      await loadFootprintsPromise();
      if (!isMountedRef.current) return;

      const response = await fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json");
      if (!response.ok) throw new Error("Failed to load map");
      const chinaMapData = await response.json();
      if (!isMountedRef.current) return;

      window.echarts.registerMap("china", chinaMapData);
      const chart = window.echarts.init(chartElement);
      chartInstanceRef.current = chart;
      if (!isMountedRef.current) { chart.dispose(); return; }

      const visitedProvinces = getVisitedProvinces();
      const provinceData = chinaMapData.features.map((f: any) => ({
        name: f.properties.name,
        value: visitedProvinces.has(f.properties.name) ? 1 : 0,
      }));

      chart.setOption({
        title: { text: user ? "我的旅行足迹" : "博主足迹", left: "center", top: 20, textStyle: { fontSize: 24 } },
        tooltip: { trigger: "item", formatter: (params: any) => {
          const isVisited = visitedProvinces.has(params.name);
          return `<b>${params.name}</b><br/>${isVisited ? "✓ 已访问" : "未访问"}`;
        }},
        visualMap: { show: false, min: 0, max: 1, inRange: { color: ["#f1f5f9", "#3b82f6"] } },
        geo: { 
          map: "china", 
          zoom: 1.15, 
          roam: true, 
          emphasis: { itemStyle: { areaColor: "#fbbf24" } }, 
          itemStyle: { normal: { areaColor: "#f1f5f9", borderColor: "#cbd5e1" } } 
        },
        series: [{ 
          name: "省份", 
          type: "map", 
          map: "china", 
          data: provinceData,
          emphasis: { itemStyle: { areaColor: "#fbbf24" } }
        }],
      });

      chart.on("click", (params: any) => {
        if (params.seriesType === "map" && user) {
          const provinceCities = citiesData[params.name as keyof typeof citiesData] || [];
          setCities(provinceCities);
          setSelectedProvince(params.name);
          setShowCityModal(true);
        }
      });

      window.addEventListener("resize", () => chart.resize());
      setLoading(false);
    } catch (err) {
      console.error("初始化地图失败:", err);
      if (isMountedRef.current) { setError("地图加载失败"); setLoading(false); }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => initChart(), 500);
    return () => { isMountedRef.current = false; clearTimeout(timer); if (chartInstanceRef.current) chartInstanceRef.current.dispose(); };
  }, [chartElement]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
            <div className="animate-float absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" style={{ animationDelay: "2s" }} />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="mb-3 text-4xl font-bold">
                <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">旅行地图</span>
              </h1>
              <p className="text-muted-foreground">{user ? "左键点击省份选择城市" : "博主去过的城市"}</p>
            </div>

            {loading || authLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-muted-foreground">地图加载中...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-red-500">{error}</p>
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ height: "600px" }}>
                  <div ref={setChartElement} className="w-full h-full" />
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {footprints.map((fp) => (
                    <div key={fp.id} className="group relative rounded-xl border bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <MapPin className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{fp.province}</h3>
                          {fp.city && <p className="text-sm text-muted-foreground">{fp.city}</p>}
                          {fp.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{fp.description}</p>}
                        </div>
                        {user && <button onClick={() => handleDeleteFootprint(fp.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">选择城市 - {selectedProvince}</h2>
              <button onClick={() => setShowCityModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleAddFootprint(selectedProvince)} className="flex-1 py-2 rounded-lg bg-blue-500 text-white">整个省份</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <button key={city} onClick={() => handleAddFootprint(selectedProvince, city)} className="px-3 py-1.5 text-sm rounded-full border hover:border-blue-500">{city}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}