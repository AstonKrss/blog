import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  cookieStore.delete("auth_token");
  return NextResponse.json({ success: true });
}
