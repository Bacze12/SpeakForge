import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { findUserByEmail, linkDevice } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ ok: false, error: "email o contraseña incorrectos" }, { status: 401 });
    }
    if (deviceId) await linkDevice(deviceId, user.id).catch(() => {});

    const session = { id: user.id, email: user.email, name: user.name };
    const res = NextResponse.json({ ok: true, user: session });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
