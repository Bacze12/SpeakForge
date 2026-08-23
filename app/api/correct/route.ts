import { NextResponse } from "next/server";
import {
  contentLengthTooLarge,
  isTextWithinLimit,
  MAX_TEXT_CHARS,
} from "@/lib/apiGuards";

export async function POST(req: Request) {
  if (contentLengthTooLarge(req, 64 * 1024)) {
    return NextResponse.json(
      { error: "El texto es demasiado grande." },
      { status: 413 },
    );
  }
  let level = "A2";
  let text = "";
  try {
    const body = await req.json();
    level = body.level || level;
    text = String(body.text || "").trim();
  } catch {
    // use defaults
  }
  if (!isTextWithinLimit(text, MAX_TEXT_CHARS)) {
    return NextResponse.json(
      { error: "Escribe primero tu texto." },
      { status: 400 },
    );
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "No Groq API key" }, { status: 500 });
  }
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const prompt = `Corrige y mejora el siguiente texto que escribió un hispanohablante de nivel ${level}. Puede estar en inglés o en español.

Si está en español, tradúcelo a inglés natural. Si está en inglés, corrígelo y mejóralo.
Respeta el nivel ${level} (vocabulario y gramática acordes, sin cambiar el mensaje que quiere transmitir).

RESPONDE SOLO CON JSON VÁLIDO con estas claves:
"corrected": el texto final en INGLÉS corregido y natural.
"es": la traducción del texto corregido al español.
"notes": un ARRAY de correcciones, cada una con: "before" (lo que estaba mal, en inglés), "after" (la forma correcta), "why" (explicación corta en español, 1 línea).
"tips": un ARRAY de 1-3 consejos en español (gramática o vocabulario).

Texto del usuario:
"""${text}"""`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Eres un corrector de inglés para hispanohablantes. Respondes solo con JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Groq ${res.status}: ${err}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // ignore
    }
    return NextResponse.json({
      corrected: String(parsed.corrected || text),
      es: String(parsed.es || ""),
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
