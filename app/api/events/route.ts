import { NextRequest, NextResponse } from "next/server";
import { insertAttempt, insertError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
    if (!deviceId) {
      return NextResponse.json({ ok: false, error: "deviceId requerido" }, { status: 400 });
    }
    if (body.type === "attempt" && body.conceptId) {
      await insertAttempt(deviceId, {
        conceptId: String(body.conceptId),
        success: !!body.success,
        helpUsed: Number(body.helpUsed) || 0,
        context: body.context,
        wrong: body.wrong,
        correct: body.correct,
      });
    } else if (body.type === "error" && body.wrong) {
      await insertError(deviceId, {
        errorType: String(body.errorType || "grammar"),
        wrong: String(body.wrong),
        correct: body.correct,
        context: body.context,
      });
    } else {
      return NextResponse.json({ ok: false, error: "tipo de evento inválido" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Los eventos son best-effort: nunca rompen la UI.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
