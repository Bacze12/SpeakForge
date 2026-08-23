import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

function extractId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(url.trim()) ? url.trim() : "";
}

const LANGS = ["en", "es", "en-US", "es-419"];

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";
  const id = extractId(url);
  if (!id) {
    return NextResponse.json({ error: "URL de YouTube no válida." }, { status: 400 });
  }
  let lastErr = "";
  for (const lang of LANGS) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(id, { lang });
      const lines = transcript
        .filter((t) => t.text && t.text.trim())
        .map((t) => ({
          text: t.text.replace(/\s+/g, " ").trim(),
          start: Math.round(t.offset),
          duration: Math.round(t.duration),
        }));
      if (lines.length) {
        const msCount = lines.filter((t) => t.duration >= 50).length;
        const isMs = msCount >= lines.length / 2;
        const normalized = lines.map((t) => ({
          text: t.text,
          start: isMs ? Math.round(t.start / 1000) : t.start,
          duration: isMs ? Math.round(t.duration / 1000) : t.duration,
        }));
        return NextResponse.json({ lines: normalized });
      }
    } catch (e) {
      lastErr = String(e);
    }
  }
  const disabled = /disabled|captions not available|no transcript/i.test(lastErr);
  return NextResponse.json(
    {
      error: disabled
        ? "Este video no tiene subtítulos disponibles (o son automáticos no accesibles). Prueba otro video de la lista."
        : (lastErr || "No se pudieron cargar los subtítulos de este video."),
    },
    { status: 404 }
  );
}