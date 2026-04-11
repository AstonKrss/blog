"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MapPin, Plane, X, Plus, MapPinned, Loader2, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const MapWithNoSSR = dynamic(() => import("@/components/Map"), { ssr: false });

interface VisitedCity {
  id: number;
  name: string;
  province: string;
  country: string;
  lat: number;
  lng: number;
  date: string;
  notes?: string;
}

const PROVINCES_DATA: { name: string; path: string; capital: string; center: [number, number] }[] = [
  { name: "广东", path: "M600,380 L620,370 L640,375 L650,390 L660,410 L650,430 L630,440 L610,430 L600,410 L590,390 Z", capital: "广州", center: [23.1291, 113.2644] },
  { name: "浙江", path: "M530,340 L550,330 L560,345 L555,365 L540,375 L520,365 L515,345 Z", capital: "杭州", center: [30.2741, 120.1551] },
  { name: "江苏", path: "M510,310 L540,300 L555,320 L550,340 L530,350 L510,340 L500,320 Z", capital: "南京", center: [32.0603, 118.7969] },
  { name: "山东", path: "M480,280 L520,260 L540,280 L530,310 L500,320 L470,300 Z", capital: "济南", center: [36.6512, 117.1201] },
  { name: "河南", path: "M460,320 L490,310 L510,330 L500,360 L470,370 L450,350 Z", capital: "郑州", center: [34.7466, 113.6253] },
  { name: "四川", path: "M350,320 L420,310 L440,340 L430,380 L380,400 L340,380 L330,340 Z", capital: "成都", center: [30.5728, 104.0668] },
  { name: "湖北", path: "M470,350 L510,340 L520,370 L500,400 L470,390 L460,370 Z", capital: "武汉", center: [30.5928, 114.3055] },
  { name: "湖南", path: "M470,400 L510,390 L530,420 L510,450 L470,440 L460,420 Z", capital: "长沙", center: [28.2282, 112.9388] },
  { name: "江西", path: "M520,400 L560,390 L580,420 L560,450 L520,440 L510,420 Z", capital: "南昌", center: [28.6829, 115.8579] },
  { name: "安徽", path: "M500,340 L540,330 L550,360 L530,380 L500,370 L490,350 Z", capital: "合肥", center: [31.8612, 117.2841] },
  { name: "福建", path: "M560,420 L590,410 L610,440 L590,470 L560,460 L550,440 Z", capital: "福州", center: [26.0745, 119.2965] },
  { name: "台湾", path: "M620,460 L630,450 L635,480 L625,500 L615,480 Z", capital: "台北", center: [25.0330, 121.5654] },
  { name: "海南", path: "M480,520 L500,510 L510,530 L500,550 L480,540 L470,520 Z", capital: "海口", center: [20.0174, 110.3492] },
  { name: "广西", path: "M420,440 L480,430 L500,460 L480,490 L420,480 L400,460 Z", capital: "南宁", center: [22.8170, 108.3665] },
  { name: "贵州", path: "M400,400 L440,390 L450,420 L430,450 L400,440 L390,420 Z", capital: "贵阳", center: [26.6470, 106.6302] },
  { name: "云南", path: "M340,400 L400,390 L420,440 L400,490 L340,480 L320,440 Z", capital: "昆明", center: [25.0406, 102.7129] },
  { name: "陕西", path: "M400,310 L450,300 L460,340 L440,370 L400,360 L390,330 Z", capital: "西安", center: [34.3416, 108.9398] },
  { name: "甘肃", path: "M340,270 L420,260 L440,300 L420,340 L340,330 L320,300 Z", capital: "兰州", center: [36.0611, 103.8343] },
  { name: "青海", path: "M320,260 L380,250 L400,290 L380,330 L320,320 L300,290 Z", capital: "西宁", center: [36.6171, 101.7782] },
  { name: "内蒙古", path: "M300,200 L450,180 L480,240 L450,300 L350,310 L280,260 Z", capital: "呼和浩特", center: [40.8414, 111.7519] },
  { name: "黑龙江", path: "M550,150 L650,140 L680,180 L660,220 L580,230 L530,200 Z", capital: "哈尔滨", center: [45.8038, 126.5340] },
  { name: "吉林", path: "M580,190 L640,180 L660,210 L640,240 L590,230 L570,210 Z", capital: "长春", center: [43.8868, 125.3245] },
  { name: "辽宁", path: "M530,220 L600,200 L620,230 L600,260 L550,260 L520,240 Z", capital: "沈阳", center: [41.8087, 123.4328] },
  { name: "河北", path: "M450,260 L500,250 L520,280 L500,310 L460,300 L440,280 Z", capital: "石家庄", center: [38.0374, 114.5149] },
  { name: "山西", path: "M420,270 L470,260 L480,300 L460,330 L420,320 L410,290 Z", capital: "太原", center: [37.8706, 112.5489] },
  { name: "北京", path: "M460,270 L475,265 L480,280 L470,290 L460,285 Z", capital: "北京", center: [39.9042, 116.4074] },
  { name: "天津", path: "M470,280 L485,275 L490,290 L480,300 L470,295 Z", capital: "天津", center: [39.1256, 117.1909] },
  { name: "上海", path: "M545,360 L560,355 L565,370 L555,380 L545,375 Z", capital: "上海", center: [31.2304, 121.4737] },
  { name: "重庆", path: "M410,390 L440,385 L450,415 L435,445 L405,435 L395,410 Z", capital: "重庆", center: [29.5630, 106.5516] },
  { name: "西藏", path: "M200,350 L340,320 L360,400 L300,480 L180,450 L160,400 Z", capital: "拉萨", center: [29.6500, 91.1000] },
  { name: "新疆", path: "M180,200 L320,180 L340,260 L280,320 L160,300 L140,250 Z", capital: "乌鲁木齐", center: [43.7930, 87.6271] },
  { name: "香港", path: "M490,480 L500,475 L505,490 L495,500 L485,490 Z", capital: "香港", center: [22.3193, 114.1694] },
  { name: "澳门", path: "M495,485 L505,480 L510,492 L500,502 L492,492 Z", capital: "澳门", center: [22.1987, 113.5439] },
  { name: "宁夏", path: "M390,290 L420,285 L430,310 L415,335 L385,325 Z", capital: "银川", center: [38.4872, 106.2309] },
];

const CHINA_CENTER: [number, number] = [35.8617, 104.1954];

export default function TravelMapPage() {
  const [cities, setCities] = useState<VisitedCity[]>([]);
  const [visitedProvinces, setVisitedProvinces] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<VisitedCity | null>(null);
  const [currentProvince, setCurrentProvince] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "china">("map");
  const [mapKey, setMapKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityDate, setNewCityDate] = useState("");
  const [newCityNotes, setNewCityNotes] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("visitedCities");
    if (saved) {
      const parsed = JSON.parse(saved);
      setCities(parsed);
      const provinces = [...new Set(parsed.map((c: VisitedCity) => c.province))];
      setVisitedProvinces(provinces);
    }
  }, []);

  const saveCities = useCallback((newCities: VisitedCity[]) => {
    setCities(newCities);
    localStorage.setItem("visitedCities", JSON.stringify(newCities));
    const provinces = [...new Set(newCities.map(c => c.province))];
    setVisitedProvinces(provinces);
  }, []);

  const getFilteredCities = () => {
    if (currentProvince) return cities.filter(c => c.province === currentProvince);
    return cities;
  };

  const getVisitedCountInProvince = (provinceName: string) => {
    return cities.filter(c => c.province === provinceName).length;
  };

  const getProvinceCenter = (provinceName: string): [number, number] => {
    const province = PROVINCES_DATA.find(p => p.name === provinceName);
    return province ? province.center as [number, number] : CHINA_CENTER;
  };

  const handleProvinceClick = (provinceName: string) => {
    setCurrentProvince(provinceName);
    setViewMode("china");
    setMapKey(prev => prev + 1);
  };

  const handleProvinceRightClick = (e: React.MouseEvent, provinceName: string) => {
    e.preventDefault();
    const province = PROVINCES_DATA.find(p => p.name === provinceName);
    if (province && !visitedProvinces.includes(provinceName)) {
      const newCity: VisitedCity = {
        id: Date.now(),
        name: province.capital,
        province: provinceName,
        country: "中国",
        lat: province.center[0],
        lng: province.center[1],
        date: new Date().toISOString().slice(0, 7),
        notes: "右键快速点亮",
      };
      const newCities = [...cities, newCity];
      saveCities(newCities);
      setMapKey(prev => prev + 1);
    }
  };

  const handleBackToChina = () => {
    setCurrentProvince(null);
    setViewMode("map");
    setMapKey(prev => prev + 1);
  };

  const handleAddCity = () => {
    if (!newCityName || !newCityDate) return;
    const province = PROVINCES_DATA.find(p => p.name === newCityName || p.capital === newCityName);
    if (!province) {
      alert("请输入有效的省份或省会城市");
      return;
    }
    const exists = cities.find(c => c.name === newCityName || c.province === province.name);
    if (exists) {
      alert("该城市或省份已存在");
      return;
    }
    const newCity: VisitedCity = {
      id: Date.now(),
      name: newCityName,
      province: province.name,
      country: "中国",
      lat: province.center[0],
      lng: province.center[1],
      date: newCityDate,
      notes: newCityNotes,
    };
    const newCities = [...cities, newCity];
    saveCities(newCities);
    setMapKey(prev => prev + 1);
    setShowAddModal(false);
    setNewCityName("");
    setNewCityDate("");
    setNewCityNotes("");
  };

  const handleDeleteCity = (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    const newCities = cities.filter(c => c.id !== id);
    saveCities(newCities);
    setMapKey(prev => prev + 1);
    setSelectedCity(null);
  };

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const res = await fetch("http://ip-api.com/json/?lang=zh-CN");
      const data = await res.json();
      if (data.status === "success") {
        const cityName = data.city || data.regionName;
        const province = PROVINCES_DATA.find(p => p.capital === cityName || p.name === cityName);
        if (province) {
          const exists = cities.some(c => c.province === province.name);
          if (!exists) {
            const newCity: VisitedCity = {
              id: Date.now(),
              name: province.capital,
              province: province.name,
              country: "中国",
              lat: province.center[0],
              lng: province.center[1],
              date: new Date().toISOString().slice(0, 7),
              notes: "自动检测点亮",
            };
            const newCities = [...cities, newCity];
            saveCities(newCities);
            setMapKey(prev => prev + 1);
            setCurrentProvince(province.name);
            setViewMode("china");
            alert(`已成功点亮: ${province.name}`);
          } else {
            setCurrentProvince(province.name);
            setViewMode("china");
            setMapKey(prev => prev + 1);
            alert("已为您定位到该省份");
          }
        } else {
          alert(`暂不支持点亮 ${cityName}`);
        }
      } else {
        alert("无法获取您的位置信息");
      }
    } catch (e) {
      alert("获取位置失败");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCityClick = (cityName: string) => {
    const exists = cities.some(c => c.name === cityName);
    if (!exists) {
      const province = PROVINCES_DATA.find(p => p.name === currentProvince);
      if (province) {
        const newCity: VisitedCity = {
          id: Date.now(),
          name: cityName,
          province: currentProvince!,
          country: "中国",
          lat: province.center[0],
          lng: province.center[1],
          date: new Date().toISOString().slice(0, 7),
        };
        const newCities = [...cities, newCity];
        saveCities(newCities);
        setMapKey(prev => prev + 1);
      }
    }
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
              <p className="text-muted-foreground">左键选择省份，右键快速点亮</p>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => { setViewMode("map"); setCurrentProvince(null); setMapKey(prev => prev + 1); }}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    viewMode === "map" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  🗺️ 世界地图
                </button>
                <button
                  onClick={() => { setViewMode("china"); setCurrentProvince(null); setMapKey(prev => prev + 1); }}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    viewMode === "china" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  🇨🇳 中国地图
                </button>
              </div>
              {currentProvince && (
                <button onClick={handleBackToChina} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4 rotate-180" /> 返回中国地图
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={handleDetectLocation} disabled={isDetecting} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white disabled:opacity-50">
                  {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
                  {isDetecting ? "定位中..." : "点亮当前位置"}
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Plus className="h-4 w-4" /> 添加
                </button>
              </div>
            </div>

            {viewMode === "china" && !currentProvince && (
              <div className="mb-6 relative">
                <svg viewBox="100 100 600 500" className="w-full h-auto" style={{ maxHeight: "500px" }}>
                  <defs>
                    <linearGradient id="chinaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a5f" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect x="100" y="100" width="600" height="500" fill="url(#chinaGradient)" rx="10" />
                  
                  {PROVINCES_DATA.map((province) => {
                    const isVisited = visitedProvinces.includes(province.name);
                    const isHovered = hoveredProvince === province.name;
                    return (
                      <g key={province.name}>
                        <path
                          d={province.path}
                          fill={isVisited ? "#3b82f6" : "#1e40af"}
                          fillOpacity={isHovered ? 0.8 : (isVisited ? 0.6 : 0.3)}
                          stroke={isVisited ? "#60a5fa" : "#3b82f6"}
                          strokeWidth={isHovered ? 2 : 1}
                          className="cursor-pointer transition-all duration-200"
                          onClick={() => handleProvinceClick(province.name)}
                          onContextMenu={(e) => handleProvinceRightClick(e, province.name)}
                          onMouseEnter={() => setHoveredProvince(province.name)}
                          onMouseLeave={() => setHoveredProvince(null)}
                          filter={isVisited ? "url(#glow)" : ""}
                        />
                        {isVisited && (
                          <circle
                            cx={province.center[1]}
                            cy={province.center[0]}
                            r="8"
                            fill="#fbbf24"
                            className="animate-pulse"
                          />
                        )}
                        <text
                          x={province.center[1]}
                          y={province.center[0]}
                          fill={isVisited ? "white" : "#94a3b8"}
                          fontSize="10"
                          textAnchor="middle"
                          className="pointer-events-none"
                        >
                          {province.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">已访问</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-900" />
                    <span className="text-muted-foreground">未访问</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-muted-foreground">省会</span>
                  </div>
                </div>
              </div>
            )}

            {viewMode === "china" && currentProvince && (
              <div className="mb-6 bg-card rounded-xl p-4 border">
                <h3 className="font-bold mb-3">{currentProvince} - 选择城市点亮</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {["省会", "地级市1", "地级市2", "地级市3"].map((city, i) => {
                    const visitedCount = getVisitedCountInProvince(currentProvince);
                    const cityName = i === 0 ? PROVINCES_DATA.find(p => p.name === currentProvince)?.capital : `${currentProvince}市${i}`;
                    const isVisited = i < visitedCount;
                    return (
                      <button
                        key={i}
                        onClick={() => handleCityClick(cityName)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          isVisited ? "bg-blue-500 text-white" : "bg-muted hover:bg-blue-500/20"
                        }`}
                      >
                        {cityName} {isVisited && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative overflow-hidden rounded-2xl border shadow-2xl" style={{ height: "400px" }}>
              {viewMode !== "china" && (
                <MapWithNoSSR 
                  key={mapKey}
                  cities={getFilteredCities()} 
                  center={currentProvince ? getProvinceCenter(currentProvince) : [30, 80]}
                  zoom={currentProvince ? 8 : 3}
                  onCityClick={(city) => setSelectedCity(city)}
                />
              )}
              <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                已访问 {getFilteredCities().length} 个城市 / {visitedProvinces.length} 个省份
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">已访问省份</h3>
              <div className="flex flex-wrap gap-2">
                {visitedProvinces.map((province) => (
                  <button
                    key={province}
                    onClick={() => handleProvinceClick(province)}
                    className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20"
                  >
                    {province} ({getVisitedCountInProvince(province)}城)
                  </button>
                ))}
                {visitedProvinces.length === 0 && <p className="text-muted-foreground">暂无访问记录</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {selectedCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedCity(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCity.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCity.province}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCity(null)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">访问时间:</span>
                <span>{selectedCity.date}</span>
              </div>
              {selectedCity.notes && <p className="text-sm">{selectedCity.notes}</p>}
              <button onClick={() => handleDeleteCity(selectedCity.id)} className="mt-4 w-full rounded-xl bg-red-500/10 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20">
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">添加城市</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">省份</label>
                <input type="text" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} placeholder="如：广东、浙江" className="mt-1 w-full rounded-xl border bg-muted px-4 py-2.5 text-sm" list="province-list" />
                <datalist id="province-list">
                  {PROVINCES_DATA.map(p => <option key={p.name} value={p.name} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">访问时间</label>
                <input type="month" value={newCityDate} onChange={(e) => setNewCityDate(e.target.value)} className="mt-1 w-full rounded-xl border bg-muted px-4 py-2.5 text-sm" />
              </div>
              <button onClick={handleAddCity} disabled={!newCityName || !newCityDate} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}