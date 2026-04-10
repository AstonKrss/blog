import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const tag = searchParams.get("tag") || "";
    let url = `${API_BASE}/api/public/posts?page=${page}&limit=${limit}`;
    if (tag) url += `&tag=${tag}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 500 });
    return NextResponse.json(data.data);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "获取文章失败" }, { status: 500 });
  }
}
