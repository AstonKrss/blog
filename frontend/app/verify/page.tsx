"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("正在验证邮箱...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("验证链接无效，缺少 Token");
      return;
    }

    fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0) {
          setStatus("success");
          setMessage(data.data?.message || "邮箱验证成功！");
        } else {
          setStatus("error");
          setMessage(data.message || "验证失败，请稍后重试");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("网络错误，请稍后重试");
      });
  }, [token]);

  return (
    <div className="relative w-full max-w-md animate-scale-in">
      <div className="rounded-2xl border bg-card/80 backdrop-blur-xl p-8 shadow-lg glow-card text-center">
        {/* Loading 状态 */}
        {status === "loading" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">验证中...</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {/* 成功状态 */}
        {status === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">验证成功！</h1>
            <p className="text-muted-foreground mb-6">{message}</p>

            <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 mb-6 text-left">
              <Mail className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-300">
                您的邮箱已验证成功，现在可以完整使用博客的所有功能了。
              </p>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              前往登录
            </Link>
          </>
        )}

        {/* 失败状态 */}
        {status === "error" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
              <XCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">验证失败</h1>
            <p className="text-muted-foreground mb-6">{message}</p>

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                返回登录页
              </Link>
              <p className="text-xs text-muted-foreground">
                如果问题持续存在，请联系管理员。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VerifyLoading() {
  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-2xl border bg-card/80 backdrop-blur-xl p-8 shadow-lg glow-card text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
        <h1 className="text-2xl font-bold mb-2">加载中...</h1>
        <p className="text-muted-foreground">请稍候</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl" />
        </div>

        <Suspense fallback={<VerifyLoading />}>
          <VerifyContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
