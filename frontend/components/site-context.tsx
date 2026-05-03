"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SiteSettings {
  siteName: string;
  avatarUrl: string;
}

interface SiteContextType {
  settings: SiteSettings;
  loading: boolean;
}

const defaults: SiteSettings = {
  siteName: "Aston's Blog",
  avatarUrl: "https://raw.githubusercontent.com/AstonKrss/AstonKrss.github.io/main/photos/2025_06_1.jpg",
};

const SiteContext = createContext<SiteContextType>({ settings: defaults, loading: true });

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.code === 0 && data.data?.settings) {
          const s: Record<string, string> = {};
          data.data.settings.forEach((item: any) => { s[item.settingKey] = item.settingValue; });
          setSettings({
            siteName: s.site_name || defaults.siteName,
            avatarUrl: s.avatar_url || defaults.avatarUrl,
          });
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    }
    fetchSettings();
  }, []);

  return (
    <SiteContext.Provider value={{ settings, loading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteContext);
}
