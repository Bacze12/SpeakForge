import { NextResponse } from "next/server";

function isoToDuration(d: string): string {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || "0", 10);
  const mi = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  const total = h * 3600 + mi * 60 + s;
  if (total === 0) return "";
  if (h) return `${h}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${mi}:${String(s).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ error: "Escribe qué video buscar." }, { status: 400 });
  }
  const key = process.env.YOUTUBE_API_KEY;

  if (key) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(
          q.trim()
        )}&key=${key}`
      );
      if (!res.ok) {
        return NextResponse.json({ error: `YouTube API ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const items: any[] = data?.items ?? [];
      if (!items.length) {
        return NextResponse.json({ error: "Sin resultados para esa búsqueda." }, { status: 404 });
      }
      const ids = items
        .map((i) => i.id?.videoId)
        .filter(Boolean)
        .join(",");
      const durations: Record<string, string> = {};
      if (ids) {
        try {
          const vres = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${key}`
          );
          const vdata = await vres.json();
          for (const v of vdata?.items ?? []) {
            durations[v.id] = isoToDuration(v.contentDetails?.duration || "");
          }
        } catch {
          // durations optional
        }
      }
      const videos = items.map((i) => ({
        id: i.id?.videoId,
        title: i.snippet?.title ?? "",
        author: i.snippet?.channelTitle ?? "",
        durationText: durations[i.id?.videoId] ?? "",
        thumb: i.snippet?.thumbnails?.medium?.url || i.snippet?.thumbnails?.default?.url || "",
      }));
      return NextResponse.json({ videos });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 502 });
    }
  }

  try {
    const yts = (await import("yt-search")).default;
    const res = await yts(q.trim());
    const videos = (res.videos || []).slice(0, 12).map((v: any) => ({
      id: v.videoId,
      title: v.title,
      author: v.author?.name || "",
      duration: v.duration?.seconds || 0,
      durationText: v.duration?.timestamp || "",
      thumb: v.thumbnail || "",
    }));
    if (!videos.length) {
      return NextResponse.json({ error: "Sin resultados para esa búsqueda." }, { status: 404 });
    }
    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo buscar en YouTube ahora mismo. Para búsqueda 100% fiable y sin fallos, añade en .env.local: YOUTUBE_API_KEY=tu_clave (es gratis: console.cloud.google.com → habilitar YouTube Data API v3 → Credenciales).",
      },
      { status: 502 }
    );
  }
}