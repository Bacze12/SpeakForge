import { NextResponse } from "next/server";
import {
  contentLengthTooLarge,
  isTextWithinLimit,
  MAX_AUDIO_BASE64_CHARS,
} from "@/lib/apiGuards";

export async function POST(req: Request) {
  if (contentLengthTooLarge(req, 12 * 1024 * 1024)) {
    return NextResponse.json(
      { error: "El audio es demasiado grande." },
      { status: 413 },
    );
  }
  let audio = "";
  let mimeType = "audio/webm";
  let reference = "";
  try {
    const body = await req.json();
    audio = String(body.audio || "");
    mimeType = String(body.mimeType || mimeType);
    reference = String(body.reference || "");
  } catch {
    // use defaults
  }
  if (
    !audio ||
    audio.length > MAX_AUDIO_BASE64_CHARS ||
    !isTextWithinLimit(reference, 1000)
  ) {
    return NextResponse.json({ error: "No audio" }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "No GEMINI_API_KEY" }, { status: 500 });
  }

  const prompt = `Eres un coach de pronunciación. El usuario debía decir esta frase en inglés: "${reference}"
Escucha el audio y evalúa su pronunciación. Devuelve SOLO JSON sin markdown con esta forma exacta:
{
  "score": <número 0-10>,
  "heard": "<lo que entendiste que dijo, o '' si no se entiende>",
  "words": [{"word": "<palabra del texto de referencia>", "ok": <true/false>, "tip": "<sugerencia fonética corta en español para hispanohablantes si no la dijo bien, o ''>"}],
  "advice": "<1 frase corta de consejo en español>"
}
Sé estricto pero constructivo. Si el audio está vacío o no se entiende nada, pon score 0 y advice explicándolo.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: audio } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Gemini ${res.status}: ${err}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    const parts: { text?: string }[] =
      data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((p) => p.text || "")
      .join("")
      .trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          score: 0,
          heard: "",
          words: [],
          advice: "No se pudo analizar el audio.",
        };
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
