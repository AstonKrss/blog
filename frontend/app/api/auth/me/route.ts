import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ user: null });

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ user: null });

    const data = await res.json();
    return NextResponse.json({ user: data.data?.user || null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
