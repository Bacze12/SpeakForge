import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, hashPassword, isValidEmail, SESSION_COOKIE } from "@/lib/auth";
import { createUser, findUserByEmail, linkDevice } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "email inválido" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "la contraseña necesita al menos 6 caracteres" }, { status: 400 });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ ok: false, error: "ese email ya está registrado" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    await createUser({ id, email, name: name || email.split("@")[0], passwordHash: await hashPassword(password) });
    if (deviceId) await linkDevice(deviceId, id).catch(() => {});

    const user = { id, email, name: name || email.split("@")[0] };
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(user), {
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
