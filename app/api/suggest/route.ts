import { NextResponse } from "next/server";
import { contentLengthTooLarge, isTextWithinLimit } from "@/lib/apiGuards";

export async function POST(req: Request) {
  if (contentLengthTooLarge(req, 32 * 1024)) {
    return NextResponse.json(
      { error: "La solicitud es demasiado grande." },
      { status: 413 },
    );
  }
  let level = "A2";
  let role = "";
  let mode = "entrevista";
  let lastText = "";
  try {
    const body = await req.json();
    level = body.level || level;
    role = body.role || role;
    mode = body.mode || mode;
    lastText = body.lastText || lastText;
  } catch {
    // use defaults
  }
  if (!isTextWithinLimit(lastText, 5000) || !isTextWithinLimit(role, 200)) {
    return NextResponse.json(
      { error: "Los parámetros superan el límite permitido." },
      { status: 400 },
    );
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "No Groq API key" }, { status: 500 });
  }
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const system = `Eres un coach de entrevistas de trabajo en inglés. El usuario tiene nivel ${level} (inglés básico-intermedio: frases cortas y vocabulario sencillo). ${role ? `Puesto objetivo: ${role}.` : ""}`;

  const user = `El entrenador acaba de decir o preguntar:
"${lastText}"

Propón 4 frases cortas, naturales y en inglés que el usuario podría decir ahora mismo para responder o continuar la conversación.
IMPORTANTE: una frase cada una, fáciles para un nivel ${level}, sin palabras difíciles.
Devuelve SOLO un objeto JSON válido con la forma {"suggestions": ["frase 1", "frase 2", "frase 3", "frase 4"]}. Nada más.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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
    const content =
      data?.choices?.[0]?.message?.content ?? '{"suggestions":[]}';
    let arr: string[] = [];
    try {
      const parsed = JSON.parse(content);
      arr = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    } catch {
      arr = [];
    }
    return NextResponse.json({ suggestions: arr.slice(0, 4) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
