import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;
    if (!username || !email || !password) return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "密码至少需要6个字符" }, { status: 400 });

    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.code !== 0) return NextResponse.json({ error: data.message || "注册失败" }, { status: 400 });

    const { token, user } = data.data;
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    cookieStore.set("auth_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
    return NextResponse.json({ user, token });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
