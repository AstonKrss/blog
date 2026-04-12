"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    echarts: any;
  }
}

export default function TravelMapPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initChart = async () => {
      if (!chartRef.current || !isMounted) return;

      try {
        // 加载 ECharts
        if (!window.echarts) {
          await loadScript("https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js");
        }

        if (!isMounted) return;

        // 加载中国地图 GeoJSON - 使用更稳定的CDN源
        const mapUrls = [
          "https://cdn.jsdelivr.net/npm/echarts/map/json/china.json",
          "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
          "https://raw.githubusercontent.com/lydiahuang/ChinaMapJSON/main/china.json"
        ];
        
        let chinaMapData = null;
        for (const url of mapUrls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              chinaMapData = await response.json();
              break;
            }
          } catch (e) {
            console.log("尝试下一个地图源");
          }
        }
        
        // 如果外部源都失败，使用内嵌的简化地图数据
        if (!chinaMapData) {
          chinaMapData = getInlineChinaMap();
        }
        
        if (!isMounted) return;

        // 注册地图
        window.echarts.registerMap("china", chinaMapData);

        // 初始化图表
        const chart = window.echarts.init(chartRef.current);
        chartInstanceRef.current = chart;

        if (!isMounted) {
          chart.dispose();
          return;
        }

        // 加载足迹数据
        const footprintResponse = await fetch("/travel/footprint.json");
        const pointData = await footprintResponse.json();

        // 统计各省访问次数
        const getProvinceCounts = (data: any[]) => {
          const counts: Record<string, number> = {};
          data.forEach((item: any) => {
            if (item.province) {
              counts[item.province] = (counts[item.province] || 0) + 1;
            }
          });
          return counts;
        };

        const getProvinceData = (counts: Record<string, number>) => {
          // 获取地图数据中的所有省份
          const provinces = new Set<string>();
          if (chinaMapData.features) {
            chinaMapData.features.forEach((f: any) => {
              if (f.properties && f.properties.name) {
                provinces.add(f.properties.name);
              }
            });
          }
          
          return Array.from(provinces).map(name => ({ 
            name, 
            value: counts[name] || 0 
          }));
        };

        const provinceCounts = getProvinceCounts(pointData);
        const provinceData = getProvinceData(provinceCounts);
        const maxCount = Math.max(...Object.values(provinceCounts), 1);

        const option = {
          title: {
            text: "我的旅行足迹",
            subtext: "走过的城市",
            left: "center",
            top: 20,
            textStyle: { fontSize: 24, color: "#1e293b" },
            subtextStyle: { fontSize: 14, color: "#64748b" }
          },
          tooltip: {
            trigger: "item",
            borderColor: "#171a24",
            borderWidth: 1,
            backgroundColor: "rgba(255,255,255,0.95)",
            extraCssText: "border-radius: 8px; padding: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);",
            formatter: function(params: any) {
              if (params.seriesType === "effectScatter") {
                return `<div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${params.name}</div>` +
                  (params.data?.description ? `<div style="color: #64748b; font-size: 13px;">${params.data.description}</div>` : "");
              } else if (params.seriesType === "map") {
                const count = provinceCounts[params.name] || 0;
                return `<div style="font-size: 16px; font-weight: 600;">${params.name}</div>` +
                  (count > 0 ? `<div style="color: #3b82f6; font-size: 14px;">走过 ${count} 座城市</div>` : '<div style="color: #94a3b8; font-size: 13px;">还未踏足</div>');
              }
              return "";
            }
          },
          visualMap: {
            show: true,
            seriesIndex: 1,
            min: 0,
            max: maxCount,
            inRange: {
              color: ["#f1f5f9", "#bfdbfe", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"]
            },
            outOfRange: { color: "#f1f5f9" },
            left: "5%",
            bottom: "5%",
            itemWidth: 20,
            itemHeight: 100,
            calculable: true,
            text: ["访问量高", "访问量低"],
            textStyle: { color: "#64748b" }
          },
          geo: {
            map: "china",
            zoom: 1.15,
            scaleLimit: { min: 0.8, max: 8 },
            roam: true,
            emphasis: {
              label: { show: false },
              itemStyle: { areaColor: "#fbbf24" }
            },
            itemStyle: {
              normal: {
                areaColor: "#f1f5f9",
                borderColor: "#cbd5e1",
                borderWidth: 1
              },
              emphasis: {
                areaColor: "#fef3c7"
              }
            }
          },
          series: [
            {
              name: "足迹",
              type: "effectScatter",
              coordinateSystem: "geo",
              data: pointData,
              symbolSize: 12,
              showEffectOn: "render",
              rippleEffect: { brushType: "stroke", scale: 3 },
              itemStyle: {
                normal: {
                  color: "#3b82f6",
                  shadowBlur: 10,
                  shadowColor: "rgba(59, 130, 246, 0.5)"
                }
              },
              emphasis: {
                itemStyle: {
                  color: "#1d4ed8",
                  shadowBlur: 20,
                  shadowColor: "rgba(29, 78, 216, 0.6)"
                }
              }
            },
            {
              name: "省份访问次数",
              type: "map",
              mapType: "china",
              data: provinceData,
              geoIndex: 0,
              showLegendSymbol: false
            }
          ]
        };

        chart.setOption(option);

        // 响应式
        const handleResize = () => chart.resize();
        window.addEventListener("resize", handleResize);

        // 点击事件
        chart.on("click", function(params: any) {
          if (params.seriesType === "effectScatter" && params.data?.description) {
            console.log("点击城市:", params.name, params.data.description);
          }
        });

        // 双击复位
        chart.getZr().on("dblclick", () => {
          chart.setOption({ geo: { zoom: 1.15, center: null } });
        });

        setLoading(false);

      } catch (err) {
        console.error("初始化地图失败:", err);
        if (isMounted) {
          setError("地图加载失败");
          setLoading(false);
        }
      }
    };

    initChart();

    return () => {
      isMounted = false;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }
    };
  }, []);

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
              <p className="text-muted-foreground">记录走过的每一座城市</p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-muted-foreground">地图加载中...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-500">{error}</p>
                  <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">
                    刷新页面
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ height: "600px" }}>
                <div ref={chartRef} className="w-full h-full" />
              </div>
            )}

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-6 rounded-full bg-white/80 px-6 py-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">已访问城市</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-200" />
                  <span className="text-sm text-muted-foreground">未访问</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// 简化版中国地图GeoJSON数据（仅包含省份轮廓）
function getInlineChinaMap() {
  return {
    "type": "FeatureCollection",
    "features": [
      { "type": "Feature", "properties": { "name": "广东" }, "geometry": { "type": "Polygon", "coordinates": [[[110,20],[115,25],[120,25],[120,22],[115,20],[110,20]]] } },
      { "type": "Feature", "properties": { "name": "浙江" }, "geometry": { "type": "Polygon", "coordinates": [[[118,27],[122,31],[122,29],[118,27]]] } },
      { "type": "Feature", "properties": { "name": "江苏" }, "geometry": { "type": "Polygon", "coordinates": [[[116,31],[121,34],[121,32],[116,31]]] } },
      { "type": "Feature", "properties": { "name": "山东" }, "geometry": { "type": "Polygon", "coordinates": [[[114,34],[121,38],[121,36],[114,34]]] } },
      { "type": "Feature", "properties": { "name": "河南" }, "geometry": { "type": "Polygon", "coordinates": [[[110,31],[116,35],[116,33],[110,31]]] } },
      { "type": "Feature", "properties": { "name": "四川" }, "geometry": { "type": "Polygon", "coordinates": [[[97,26],[110,34],[110,28],[97,26]]] } },
      { "type": "Feature", "properties": { "name": "湖北" }, "geometry": { "type": "Polygon", "coordinates": [[[108,29],[116,33],[114,29],[108,29]]] } },
      { "type": "Feature", "properties": { "name": "湖南" }, "geometry": { "type": "Polygon", "coordinates": [[[106,24],[114,30],[112,26],[106,24]]] } },
      { "type": "Feature", "properties": { "name": "安徽" }, "geometry": { "type": "Polygon", "coordinates": [[[114,29],[120,32],[118,30],[114,29]]] } },
      { "type": "Feature", "properties": { "name": "江西" }, "geometry": { "type": "Polygon", "coordinates": [[[114,24],[118,30],[118,28],[114,24]]] } },
      { "type": "Feature", "properties": { "name": "福建" }, "geometry": { "type": "Polygon", "coordinates": [[[117,24],[120,28],[119,25],[117,24]]] } },
      { "type": "Feature", "properties": { "name": "台湾" }, "geometry": { "type": "Polygon", "coordinates": [[[120,22],[122,25],[121,25],[120,22]]] } },
      { "type": "Feature", "properties": { "name": "海南" }, "geometry": { "type": "Polygon", "coordinates": [[[108,18],[111,20],[110,19],[108,18]]] } },
      { "type": "Feature", "properties": { "name": "广西" }, "geometry": { "type": "Polygon", "coordinates": [[[104,21],[112,26],[110,24],[104,21]]] } },
      { "type": "Feature", "properties": { "name": "贵州" }, "geometry": { "type": "Polygon", "coordinates": [[[104,24],[109,29],[107,26],[104,24]]] } },
      { "type": "Feature", "properties": { "name": "云南" }, "geometry": { "type": "Polygon", "coordinates": [[[97,21],[106,27],[104,25],[97,21]]] } },
      { "type": "Feature", "properties": { "name": "陕西" }, "geometry": { "type": "Polygon", "coordinates": [[[105,32],[111,39],[110,36],[105,32]]] } },
      { "type": "Feature", "properties": { "name": "甘肃" }, "geometry": { "type": "Polygon", "coordinates": [[[92,32],[108,42],[106,38],[92,32]]] } },
      { "type": "Feature", "properties": { "name": "青海" }, "geometry": { "type": "Polygon", "coordinates": [[[89,35],[102,39],[99,35],[89,35]]] } },
      { "type": "Feature", "properties": { "name": "内蒙古" }, "geometry": { "type": "Polygon", "coordinates": [[[97,38],[125,53],[120,46],[97,38]]] } },
      { "type": "Feature", "properties": { "name": "黑龙江" }, "geometry": { "type": "Polygon", "coordinates": [[[121,45],[134,53],[130,48],[121,45]]] } },
      { "type": "Feature", "properties": { "name": "吉林" }, "geometry": { "type": "Polygon", "coordinates": [[[121,40],[131,46],[128,43],[121,40]]] } },
      { "type": "Feature", "properties": { "name": "辽宁" }, "geometry": { "type": "Polygon", "coordinates": [[[118,38],[125,43],[123,40],[118,38]]] } },
      { "type": "Feature", "properties": { "name": "河北" }, "geometry": { "type": "Polygon", "coordinates": [[[113,36],[120,40],[118,38],[113,36]]] } },
      { "type": "Feature", "properties": { "name": "山西" }, "geometry": { "type": "Polygon", "coordinates": [[[110,35],[114,40],[113,37],[110,35]]] } },
      { "type": "Feature", "properties": { "name": "北京" }, "geometry": { "type": "Polygon", "coordinates": [[[116,39],[117,41],[116,40],[116,39]]] } },
      { "type": "Feature", "properties": { "name": "天津" }, "geometry": { "type": "Polygon", "coordinates": [[[116,38],[118,40],[117,39],[116,38]]] } },
      { "type": "Feature", "properties": { "name": "上海" }, "geometry": { "type": "Polygon", "coordinates": [[[120,30],[122,32],[121,31],[120,30]]] } },
      { "type": "Feature", "properties": { "name": "重庆" }, "geometry": { "type": "Polygon", "coordinates": [[[106,28],[110,32],[108,29],[106,28]]] } },
      { "type": "Feature", "properties": { "name": "西藏" }, "geometry": { "type": "Polygon", "coordinates": [[[78,28],[97,36],[92,31],[78,28]]] } },
      { "type": "Feature", "properties": { "name": "新疆" }, "geometry": { "type": "Polygon", "coordinates": [[[73,35],[96,50],[90,42],[73,35]]] } },
      { "type": "Feature", "properties": { "name": "宁夏" }, "geometry": { "type": "Polygon", "coordinates": [[[104,37],[106,39],[105,38],[104,37]]] } },
      { "type": "Feature", "properties": { "name": "香港" }, "geometry": { "type": "Polygon", "coordinates": [[[113,22],[115,23],[114,22],[113,22]]] } },
      { "type": "Feature", "properties": { "name": "澳门" }, "geometry": { "type": "Polygon", "coordinates": [[[113,22],[114,23],[113,22],[113,22]]] } }
    ]
  };
}