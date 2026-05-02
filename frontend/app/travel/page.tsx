"use client"
import { getToken } from "@/lib/token"
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2, Trash2, MapPin, X, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import citiesData from "./cities.json";

declare global { interface Window { echarts: any; } }

interface Footprint {
  id: string;
  province: string;
  city?: string;
  description?: string;
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

  const loadFootprintsPromise = () => new Promise<void>((resolve) => {
    fetch(`${API_BASE}/api/public/footprints`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0 && data.data) {
          setFootprints(data.data.map((f: any) => ({ id: f.id, province: f.province, city: f.city || null, description: f.description })));
        }
      })
      .catch(err => console.error(err))
      .finally(() => resolve());
  });

  const handleAddFootprint = async (province: string, city?: string) => {
    if (!user) return;
    const token = getToken();
    try {
      await fetch(`${API_BASE}/api/footprints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ province, city: city || null, description }),
      });
      setShowCityModal(false); setSelectedProvince(""); setDescription("");
      loadFootprintsPromise();
    } catch (err) { console.error(err); }
  };

  const handleDeleteFootprint = async (id: string) => {
    if (!confirm("确定删除这个足迹？")) return;
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/footprints/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setFootprints(footprints.filter(f => f.id !== id));
  };

  const getVisitedProvinces = () => { const visited = new Set<string>(); footprints.forEach(f => visited.add(f.province)); return visited; };

  const initChart = async () => {
    if (!chartElement || !isMountedRef.current) return;
    try {
      if (!window.echarts) await loadScript("https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js");
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
      const provinceData = chinaMapData.features.map((f: any) => ({ name: f.properties.name, value: visitedProvinces.has(f.properties.name) ? 1 : 0 }));
      chart.setOption({
        title: { text: user ? "我的旅行足迹" : "博主足迹", left: "center", top: 20, textStyle: { fontSize: 24 } },
        tooltip: { trigger: "item", formatter: (params: any) => `<b>${params.name}</b><br/>${visitedProvinces.has(params.name) ? "✓ 已访问" : "未访问"}` },
        visualMap: { show: false, min: 0, max: 1, inRange: { color: ["#f1f5f9", "#3b82f6"] } },
        geo: { map: "china", zoom: 1.15, roam: true, emphasis: { itemStyle: { areaColor: "#fbbf24" } }, itemStyle: { normal: { areaColor: "#f1f5f9", borderColor: "#cbd5e1" } } },
        series: [{ name: "省份", type: "map", map: "china", data: provinceData, emphasis: { itemStyle: { areaColor: "#fbbf24" } } }],
      });
      chart.on("click", (params: any) => {
        if (params.seriesType === "map" && user) {
          const provinceCities = citiesData[params.name as keyof typeof citiesData] || [];
          setCities(provinceCities); setSelectedProvince(params.name); setShowCityModal(true);
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="animate-float-delayed -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-14">
          {/* Header */}
          <div className="mb-10 text-center animate-fade-in-up">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-xl shadow-blue-500/30">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-4 text-4xl md:text-5xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">旅行地图</span>
            </h1>
            <p className="text-muted-foreground">{user ? "左键点击省份选择城市" : "博主去过的城市"}</p>
          </div>

          {loading || authLoading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl glass-card animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
              <p className="text-muted-foreground">地图加载中...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 rounded-2xl glass-card text-center animate-fade-in">
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : (
            <>
              {/* Map */}
              <div className="relative overflow-hidden rounded-2xl glass-card shadow-2xl animate-fade-in-up delay-100" style={{ height: "600px" }}>
                <div ref={setChartElement} className="w-full h-full" />
              </div>

              {/* Footprints list */}
              {footprints.length > 0 && (
                <div className="mt-10 animate-fade-in-up delay-200">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <h2 className="text-2xl font-black">已访问地区 ({footprints.length})</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-container">
                    {footprints.map((fp, i) => (
                      <div key={fp.id} className="group relative rounded-2xl glass-card p-5 shadow-sm transition-all duration-400 hover:-translate-y-1 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: `${0.05 * i}s` }}>
                        <div className="absolute top-0 right-0 h-6 w-1 rounded-l-full bg-gradient-to-b from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-500 shadow-md transition-transform duration-300 group-hover:scale-110">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base">{fp.province}</h3>
                            {fp.city && <p className="text-sm text-muted-foreground">{fp.city}</p>}
                            {fp.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{fp.description}</p>}
                          </div>
                          {user && (
                            <button onClick={() => handleDeleteFootprint(fp.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowCityModal(false)}>
          <div className="w-full max-w-md rounded-2xl glass-card shadow-2xl animate-bounce-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <h2 className="text-lg font-bold">选择城市 - {selectedProvince}</h2>
              </div>
              <button onClick={() => setShowCityModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">描述 (可选)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all" placeholder="这次旅行的感想..." />
              </div>
              <button onClick={() => handleAddFootprint(selectedProvince)} className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <MapPin className="h-4 w-4 relative z-10" />
                <span className="relative z-10">标记整个省份</span>
              </button>
              {cities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">或选择具体城市</p>
                  <div className="flex flex-wrap gap-2">
                    {cities.map((city) => (
                      <button key={city} onClick={() => handleAddFootprint(selectedProvince, city)} className="px-3 py-1.5 text-sm rounded-xl border border-border/50 hover:border-blue-500 hover:bg-blue-500/5 hover:text-blue-500 transition-all">
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
    script.src = src; script.onload = () => resolve(); script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}