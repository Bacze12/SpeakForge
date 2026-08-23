import { NextRequest, NextResponse } from "next/server";
import { getLatestStateForUser, getLearnerState, pingDb, upsertLearnerState } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const userId = req.nextUrl.searchParams.get("userId");
  try {
    if (!deviceId && !userId) {
      const ping = await pingDb();
      return NextResponse.json({ ok: ping.ok, latencyMs: ping.latencyMs });
    }
    if (userId) {
      const latest = await getLatestStateForUser(userId);
      return NextResponse.json({ ok: true, state: latest?.state ?? null, updatedAt: latest?.updatedAt ?? 0 });
    }
    const state = await getLearnerState(deviceId || "");
    return NextResponse.json({ ok: true, state });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
    if (!deviceId || !body.state) {
      return NextResponse.json({ ok: false, error: "deviceId y state requeridos" }, { status: 400 });
    }
    await upsertLearnerState(deviceId, body.state, {
      level: body.level,
      xp: body.xp,
      streakDays: body.streakDays,
      userId: body.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
