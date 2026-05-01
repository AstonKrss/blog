import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  // 从 cookie 获取 token（rewrite 请求时 cookie 会被自动带上）
  // 或者从 sessionStorage 获取
  const token = request.cookies.get("auth_token")?.value || getToken();

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "10";
  const status = searchParams.get("status") || "";

  const res = await fetch(`${API_BASE}/api/posts?page=${page}&limit=${limit}&status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取 token（客户端发送）
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : getToken();

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();

    const res = await fetch(`${API_BASE}/api/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "创建文章失败" }, { status: 500 });
  }
}