import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-context";
import { MusicPlayer } from "@/components/music-player";
import { BackToTop } from "@/components/back-to-top";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aston's Blog",
  description: "DevSecOps 实践与技术分享",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground">
              {children}
              <MusicPlayer />
              <BackToTop />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}