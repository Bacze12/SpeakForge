import { NextRequest, NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ ok: true, user });
}
