import { NextRequest, NextResponse } from "next/server";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const res = await fetch(`${API_BASE}/api/public/comments/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 500 });
    return NextResponse.json(data.data);
  } catch { return NextResponse.json({ error: "评论失败" }, { status: 500 }); }
}
