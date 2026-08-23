import { NextResponse } from "next/server";
import { userFromSession, COOKIE_NAME } from "@/lib/auth";

export async function GET(req: Request) {
  const token = req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!(await userFromSession(token))) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    {
      key: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-preview",
      voice: process.env.GEMINI_VOICE || "Aoede",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
