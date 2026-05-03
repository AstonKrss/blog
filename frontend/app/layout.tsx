import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeClassHandler } from "@/components/theme-class-handler";
import { AuthProvider } from "@/components/auth-context";
import { SiteProvider } from "@/components/site-context";
import { MusicPlayer } from "@/components/music-player";
import { BackToTop } from "@/components/back-to-top";
import { ClickEffects } from "@/components/games/click-effects";
import { MusicVisualizer } from "@/components/games/music-visualizer";
import { ConsoleEasterEgg } from "@/components/games/console-easter-egg";
import { CommandPalette } from "@/components/command-palette";
import { LiveVisitor } from "@/components/live-visitor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://blog.example.com"),
  title: {
    default: "Aston's Blog",
    template: "%s | Aston's Blog",
  },
  description: "DevSecOps 实践与技术分享，记录成长",
  keywords: ["博客", "技术", "DevSecOps", "Spring Boot", "Next.js", "Java", "前端"],
  authors: [{ name: "Aston" }],
  creator: "Aston",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Aston's Blog",
    title: "Aston's Blog",
    description: "DevSecOps 实践与技术分享",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aston's Blog",
    description: "DevSecOps 实践与技术分享",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="custom"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeClassHandler />
          <AuthProvider>
            <SiteProvider>
              <div className="min-h-screen bg-background text-foreground">
                {children}
                <MusicPlayer />
                <BackToTop />
                <ClickEffects />
                <MusicVisualizer />
                <ConsoleEasterEgg />
                <CommandPalette />
                <LiveVisitor />
              </div>
            </SiteProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
