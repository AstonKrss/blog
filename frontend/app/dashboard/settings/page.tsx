"use client"
import { getToken, clearToken } from "@/lib/token"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Settings, Save, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-context";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
      return;
    }
    if (user && user.role === "ADMIN") {
      const token = getToken();
      fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.code === 0) {
            const s: Record<string, string> = {};
            (data.data?.settings || []).forEach((item: any) => { s[item.settingKey] = item.settingValue; });
            setSettings(s);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = document.cookie.split("; ").find((row) => row.startsWith("auth_token="))?.split("=")[1];
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings }),
      });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateSetting = (key: string, value: string) => setSettings({ ...settings, [key]: value });

  if (loading) return <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 flex items-center justify-center"><p>加载中...</p></main><Footer /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">站点设置</h1>
              <p className="text-sm text-muted-foreground">管理博客的基本配置</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-5 glow-card">
            <div>
              <label className="mb-1.5 block text-sm font-medium">站点标题</label>
              <input type="text" value={settings.site_title || ""} onChange={(e) => updateSetting("site_title", e.target.value)}
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">站点描述</label>
              <input type="text" value={settings.site_description || ""} onChange={(e) => updateSetting("site_description", e.target.value)}
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">每页文章数</label>
              <input type="number" value={settings.posts_per_page || "10"} onChange={(e) => updateSetting("posts_per_page", e.target.value)}
                className="w-full rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            </div>
            <div className="flex items-center justify-between py-3 border-t">
              <div>
                <p className="font-medium">允许评论</p>
                <p className="text-sm text-muted-foreground">是否开放文章评论功能</p>
              </div>
              <button onClick={() => updateSetting("allow_comments", settings.allow_comments === "true" ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allow_comments === "true" ? "bg-green-500" : "bg-muted"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${settings.allow_comments === "true" ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
              </button>
            </div>
            <div className="pt-4">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />保存设置</>}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
