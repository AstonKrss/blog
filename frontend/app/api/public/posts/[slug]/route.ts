import { NextRequest, NextResponse } from "next/server";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const res = await fetch(`${API_BASE}/api/public/posts/${slug}`);
    const data = await res.json();
    if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 404 });
    return NextResponse.json(data.data);
  } catch { return NextResponse.json({ error: "获取文章失败" }, { status: 500 }); }
}
