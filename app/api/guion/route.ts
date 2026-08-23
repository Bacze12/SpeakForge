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
  let topic = "";
  try {
    const body = await req.json();
    level = body.level || level;
    role = body.role || role;
    mode = body.mode || mode;
    topic = body.topic || topic;
  } catch {
    // use defaults
  }
  if (!isTextWithinLimit(role, 200) || !isTextWithinLimit(topic, 500)) {
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

  const guiada = mode === "guiada";
  const prompt = guiada
    ? `Eres un coach de conversación en inglés para hispanohablantes.
Crea un GUION DE JUEGO DE ROLES: el usuario va a hablar en inglés sobre el tema "${topic || "su rutina diaria"}". Su nivel es ${level}.

Escribe el papel del USUARIO (lo que ÉL puede decir), en este orden:
1. Presentar el tema (1-2 líneas).
2. Describir su tema con detalles (3-4 líneas).
3. Opinar o contar una anécdota (2 líneas).
4. Hacer una pregunta al entrenador (1 línea).

REGLAS IMPORTANTES PARA LAS LÍNEAS DEL USUARIO:
- Cada línea debe ser una ORACIÓN COMPLETA y natural de 8 a 14 palabras (nada telegráfico ni demasiado corto).
- Usa conectores y estructura acordes al nivel ${level} (A1-A2: oraciones simples pero completas; B1+: oraciones compuestas).
- Ejemplo de buena línea (A2): "I usually wake up at seven and have breakfast with my family."

Para cada línea del usuario: la frase en INGLÉS de nivel ${level}, su pronunciación fácil en español entre paréntesis (ej: "I wake up early" → "(ai wéik up érli)") y su traducción al español.
Después añade una sección **"Preguntas del entrenador"** con 3 preguntas en inglés que el coach le hará, y 1 respuesta de ejemplo corta para cada una.

RESPONDE SOLO CON JSON VÁLIDO con estas dos claves:
"guion": el guion completo en Markdown (papel del usuario con líneas, pronunciación fácil, traducción, y la sección "Preguntas del entrenador"). Todo el texto explicativo en español.
"lines": un ARRAY de OBJETOS con las frases que dirá el USUARIO, en orden, cada una con: "en" (frase en inglés), "pr" (pronunciación fácil en español, ej: "(ai wéik up érli)") y "es" (traducción al español). Ej: [{"en": "I wake up early", "pr": "(ai wéik up érli)", "es": "Me despierto temprano"}].`
    : `Eres un coach de entrevistas de trabajo en inglés.
Crea un GUION DE ENTREVISTA para un puesto de "${role || "cualquier puesto"}" adaptado a un candidato de nivel ${level} (frases cortas y vocabulario sencillo).

Estructura del guion (en este orden):
1. **Apertura** — saludo del entrevistador en inglés y cómo presentarse (1 pregunta).
2. **Experiencia** — 2 preguntas típicas sobre experiencia/estudios para ese puesto.
3. **Fortalezas y debilidades** — 1 pregunta con 1 ejemplo de respuesta.
4. **Situación laboral** — 1 pregunta sobre por qué quiere el puesto.
5. **Cierre** — 1 pregunta de salario/expectativas y 1 pregunta que el candidato puede hacer al entrevistador.

Para cada pregunta: escríbela en INGLÉS y, debajo, una RESPUESTA DE EJEMPLO corta en inglés de nivel ${level} (1-2 frases).
Después del guion, añade una sección **"Frases clave"** con 5 frases útiles en inglés con su pronunciación fácil en español (ej: "Can I..." → "Kan ai...").
Todo el texto que no sean preguntas/respuestas en inglés, explícalo en español. Usa Markdown con negritas y listas.`;

  try {
    const body: Record<string, unknown> = {
      model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "Eres un experto coach de inglés para hispanohablantes.",
        },
        { role: "user", content: prompt },
      ],
    };
    if (guiada) body.response_format = { type: "json_object" };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Groq ${res.status}: ${err}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    if (!guiada) {
      return NextResponse.json({ guion: content });
    }

    let guion = content;
    let lines: { en: string; pr: string; es: string }[] = [];
    try {
      const parsed = JSON.parse(content);
      guion = parsed.guion || content;
      if (Array.isArray(parsed.lines)) {
        lines = parsed.lines.filter(
          (l: unknown) => !!l && typeof l === "object",
        );
      }
    } catch {
      // keep raw content
    }
    return NextResponse.json({ guion, lines });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
