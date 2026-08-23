import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "sf_session";
const SESSION_TTL = "7d";

export type SessionUser = { id: string; email: string; name: string };

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

export async function readSessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return { id: String(payload.sub), email: String(payload.email || ""), name: String(payload.name || "") };
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ---- Compat con usos previos de lib/auth ---- */
export const COOKIE_NAME = SESSION_COOKIE;

export function userFromSession(token?: string | null): Promise<SessionUser | null> {
  return readSessionToken(token);
}
