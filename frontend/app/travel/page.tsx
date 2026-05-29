"use client"
import { getToken } from "@/lib/token"
import { useEffect, useRef, useState } from "react"
import * as echarts from "echarts"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Loader2, Trash2, MapPin, X, Globe, Plus } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import citiesData from "./cities.json"
import chinaGeo from "./china-geo.json"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

declare global { interface Window { footprintChart: echarts.ECharts | null; } }

interface Footprint {
  id: string
  province: string
  city?: string
  description?: string
}

interface CityPoint {
  name: string
  province: string
  value: [number, number]
  description?: string
  symbol?: string
  symbolSize?: number
}

interface FootprintPoint {
  name: string
  province: string
  value: [number, number]
  description?: string
  symbol?: string
  symbolSize?: number
}

async function loadJson(src: string): Promise<any> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Failed to load ${src}`)
  return res.json()
}

function buildProvinceCounts(points: FootprintPoint[], footprints: Footprint[]) {
  const provinceCounts: Record<string, number> = {}

  points.forEach(p => {
    provinceCounts[p.province] = (provinceCounts[p.province] || 0) + 1
  })

  footprints.forEach(f => {
    provinceCounts[f.province] = (provinceCounts[f.province] || 0) + 1
  })

  return provinceCounts
}

export default function TravelMapPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const resizeHandlerRef = useRef<(() => void) | null>(null)
  const mounted = useRef(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [footprints, setFootprints] = useState<Footprint[]>([])
  const { user, loading: authLoading } = useAuth()
  const [modal, setModal] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState("")
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [description, setDescription] = useState("")
  const [pointData, setPointData] = useState<FootprintPoint[]>([])

  const fetchFootprints = async (): Promise<Footprint[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/public/footprints`)
      const data = await res.json()
      if (data.code === 0 && data.data) {
        const nextFootprints = data.data.map((f: any) => ({
          id: f.id, province: f.province, city: f.city || undefined,
          description: f.description
        }))
        setFootprints(nextFootprints)
        return nextFootprints
      }
    } catch (e) { /* keep static footprint map available when backend is offline */ }
    setFootprints([])
    return []
  }

  const updateChartProvinceData = (points: FootprintPoint[], nextFootprints: Footprint[]) => {
    const provinceCounts = buildProvinceCounts(points, nextFootprints)
    const maxCount = Math.max(...Object.values(provinceCounts), 0) || 1

    chartInstanceRef.current?.setOption({
      visualMap: { max: maxCount },
      series: [
        { data: points },
        { data: Object.entries(provinceCounts).map(([name, value]) => ({ name, value })) }
      ]
    })
  }

  const initChart = async () => {
    if (!chartRef.current || !mounted.current) return
    try {
      echarts.registerMap("china", chinaGeo as any)
      if (!mounted.current) return

      // Load footprint.json (user's personal city points)
      const fetchedPointData: FootprintPoint[] = await loadJson("/travel/footprint.json")
      if (!mounted.current) return
      setPointData(fetchedPointData)

      const fetchedFootprints = await fetchFootprints()
      if (!mounted.current) return

      // Destroy old chart
      if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
        chartInstanceRef.current.dispose()
      }

      const chart = echarts.init(chartRef.current)
      chartInstanceRef.current = chart
      window.footprintChart = chart

      // Get max visits for visualMap
      const provinceCounts = buildProvinceCounts(fetchedPointData, fetchedFootprints)
      const maxCount = Math.max(...Object.values(provinceCounts), 0) || 1

      const option = {
        title: {
          show: false,
        },
        tooltip: {
          trigger: 'item',
          borderColor: '#171a24',
          borderWidth: 1,
          formatter: function(params: any) {
            if (params.seriesType === 'effectScatter') {
              return `<div style="font-size:14px">${params.name}</div>` +
                (params.data?.description ? `<div>${params.data.description}</div>` : '')
            } else if (params.seriesType === 'map') {
              const count = provinceCounts[params.name] || 0
              return `<div style="font-size:14px">${params.name}</div>` +
                (count > 0 ? `<div>走过${count}座城</div>` : '')
            }
            return ''
          }
        },
        visualMap: {
          show: true,
          seriesIndex: 1,
          min: 0,
          max: maxCount,
          inRange: {
            color: ['#e6e6e6', '#a7d0ed', '#5ab7fb', '#409de1', '#398cc0', '#0e76c0']
          },
          outOfRange: { color: '#e6e6e6' },
          left: '5%',
          bottom: '5%',
          itemWidth: 20,
          itemHeight: 100,
          calculable: true,
          textStyle: { color: '#fff' }
        },
        geo: {
          map: 'china',
          zoom: 1.2,
          scaleLimit: { min: 1, max: 8 },
          roam: true,
          emphasis: {
            label: { show: false },
          },
          itemStyle: {
            normal: {
              areaColor: '#e6e6e6',
              borderColor: '#171a24'
            },
            emphasis: {
              areaColor: '#f1b03f'
            }
          }
        },
        series: [
          {
            name: '足迹',
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: fetchedPointData,
            geoIndex: 0,
            showEffectOn: 'render',
            hoverAnimation: true,
            symbolSize: 8,
            itemStyle: {
              normal: {
                color: '#ffffff',
                shadowBlur: 10,
                shadowColor: '#ffffff'
              }
            }
          },
          {
            name: '省份访问次数',
            type: 'map',
            mapType: 'china',
            data: Object.entries(provinceCounts).map(([name, value]) => ({ name, value })),
            geoIndex: 0,
            showLegendSymbol: false
          }
        ]
      }

      chart.setOption(option, true)

      // Click on province → open modal
      chart.on('click', (params: any) => {
        if (params.seriesType === 'map' && params.name) {
          setSelectedProvince(params.name)
          const cities = (citiesData as Record<string, string[]>)[params.name] || []
          setSelectedCities(cities)
          setDescription("")
          setModal(true)
        }
        if (params.seriesType === 'effectScatter' && params.data?.url) {
          window.open(params.data.url, '_blank')
        }
      })

      // Double-click to reset zoom
      chart.getZr().on('dblclick', () => {
        chart.setOption({
          geo: { zoom: 1.2, center: null },
          visualMap: { range: null }
        })
      })

      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current)
      }
      resizeHandlerRef.current = () => chart.resize()
      window.addEventListener('resize', resizeHandlerRef.current)
      setLoading(false)
    } catch (e) {
      console.error("地图初始化失败", e)
      if (mounted.current) { setError("地图加载失败"); setLoading(false) }
    }
  }

  useEffect(() => {
    const t = setTimeout(initChart, 400)
    return () => {
      mounted.current = false
      clearTimeout(t)
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current)
      }
      chartInstanceRef.current?.dispose()
      window.footprintChart = null
    }
  }, [])

  const addFootprint = async (province: string, city?: string) => {
    if (!user) return
    const token = getToken()
    try {
      await fetch(`${API_BASE}/api/footprints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ province, city: city || null, description })
      })
      setModal(false)
      setDescription("")
      const nextFootprints = await fetchFootprints()
      // Refresh chart province coloring
      updateChartProvinceData(pointData, nextFootprints)
    } catch (e) { console.error(e) }
  }

  const deleteFootprint = async (id: string) => {
    if (!confirm("确定删除这个足迹？")) return
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/footprints/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const nextFootprints = footprints.filter(p => p.id !== id)
      setFootprints(nextFootprints)
      updateChartProvinceData(pointData, nextFootprints)
    }
  }

  const visitedProvinces = new Set(footprints.map(f => f.province))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-1/4 h-[600px] w-[600px] rounded-full bg-blue-500/8 blur-[120px] animate-float" />
          <div className="absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/6 blur-[80px] animate-float-delayed" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16">
          {/* Header */}
          <div className="mb-10 text-center animate-fade-in-up">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-500 shadow-xl shadow-blue-500/30">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-3 text-5xl md:text-6xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                旅行地图
              </span>
            </h1>
            <p className="text-muted-foreground text-base">
              {user ? "点击省份 → 添加足迹 · 拖拽缩放地图" : "博主去过的城市 · 拖拽缩放查看"}
            </p>
          </div>

          {loading || authLoading ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl glass-card animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
              <p className="text-muted-foreground">地图加载中...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-24 rounded-2xl glass-card text-center animate-fade-in">
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : (
            <>
              {/* Map */}
              <div className="relative overflow-hidden rounded-2xl glass-card shadow-2xl animate-fade-in-up delay-100" style={{ height: "580px" }}>
                <div ref={chartRef} className="w-full h-full" />
              </div>

              {/* Stats bar */}
              <div className="flex items-center justify-center gap-6 mt-6 mb-8 animate-fade-in-up delay-150">
                {[
                  { label: "省份", value: visitedProvinces.size, icon: "🏔" },
                  { label: "足迹", value: footprints.length, icon: "📍" },
                  { label: "城市", value: pointData.length, icon: "🏙" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 rounded-full glass-card px-5 py-2.5">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-2xl font-black text-foreground">{s.value}</span>
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Footprints */}
              {footprints.length > 0 && (
                <div className="animate-fade-in-up delay-200">
                  <h2 className="flex items-center gap-2 text-xl font-black mb-6">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    已标记足迹
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {footprints.map((fp, i) => (
                      <div
                        key={fp.id}
                        className="group rounded-2xl glass-card p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-blue-500/20 animate-fade-in-up"
                        style={{ animationDelay: `${i * 0.04}s` }}
                      >
                        <div className="absolute top-0 right-0 w-1 h-full rounded-l-full bg-gradient-to-b from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-500 shadow-md transition-transform duration-300 group-hover:scale-110">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold">{fp.province}</h3>
                            {fp.city && <p className="text-sm text-muted-foreground">{fp.city}</p>}
                            {fp.description && (
                              <p className="mt-1.5 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                                {fp.description}
                              </p>
                            )}
                          </div>
                          {user && (
                            <button
                              onClick={() => deleteFootprint(fp.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                            >
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

      {/* City selector modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl glass-card shadow-2xl overflow-hidden animate-bounce-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <h2 className="text-lg font-bold">标记足迹 · {selectedProvince}</h2>
              </div>
              <button
                onClick={() => setModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">说说感想（可选）</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  placeholder="这次旅行的感想..."
                />
              </div>
              <button
                onClick={() => addFootprint(selectedProvince)}
                className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Plus className="h-4 w-4 relative z-10" />
                <span className="relative z-10">标记整个 {selectedProvince}</span>
              </button>
              {selectedCities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">或选择具体城市</p>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {selectedCities.map(city => (
                      <button
                        key={city}
                        onClick={() => addFootprint(selectedProvince, city)}
                        className="px-3 py-1.5 text-sm rounded-xl border border-border/50 hover:border-blue-500 hover:bg-blue-500/8 hover:text-blue-400 transition-all"
                      >
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
  )
}
