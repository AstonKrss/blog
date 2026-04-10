import { NextResponse } from "next/server";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/public/archive`);
    const data = await res.json();
    if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 500 });
    return NextResponse.json(data.data);
  } catch { return NextResponse.json({ error: "获取归档失败" }, { status: 500 }); }
}
