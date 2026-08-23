"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { LiveClient } from "@/lib/liveClient";
import { AudioEngine } from "@/lib/audio";
import { PHRASES, LEVELS } from "@/lib/phrases";
import { conceptById } from "@/lib/knowledge";
import { planItemStatus } from "@/lib/learner";
import { buildPractice } from "@/lib/contextEngine";

export type Mode = "diagnostico" | "listening" | "guiada" | "entrevista" | "pro" | "libre" | "concepto" | "texto" | "ielts" | "youtube";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type Line = { en: string; pr: string; es: string };
type Prog = { done: Record<string, string[]>; lastDay: string; streak: number; sessions: number };

const MODE_LABELS: Record<Mode, string> = {
  diagnostico: "🧪 Diagnóstico",
  listening: "🎧 Escucha y Repite",
  guiada: "🎭 Diálogo guiado",
  entrevista: "🗣️ Entrevista",
  pro: "🔥 Entrevista Pro",
  libre: "💬 Modo Libre",
  concepto: "🎯 Práctica de concepto",
  texto: "✍️ Mi Texto",
  ielts: "🎓 IELTS",
  youtube: "🎬 Shadowing",
};

const MODE_DESC: Record<Mode, string> = {
  diagnostico: "Conversación de 5 minutos con tu tutor para detectar tu nivel real (A1–C2) y generar tu plan de estudio.",
  listening: "Repite cada frase hasta decirla bien. Botones para repetir o saltar.",
  guiada: "Estilo Duolingo: te muestro la línea a decir y marco en verde lo que dices bien.",
  entrevista: "Un reclutador te hace preguntas del puesto, adaptadas a tu nivel, con feedback positivo.",
  pro: "Entrevista completa y realista: te interrumpo, indago y corrijo en voz sin ayudas.",
  libre: "Háblame libremente y pídeme ayuda: cómo se dice algo, corrígeme, practica.",
  concepto: "Práctica enfocada en UN concepto: el tutor solo trabaja ese tema, lo produce y te corrige en él.",
  texto: "Escribe a mano con stylus o teclea, te corrijo la gramática, lo leo en voz alta y lo practicas.",
  ielts: "Simulación oficial IELTS Speaking (Partes 1-3) con puntuación por bandas.",
  youtube: "Mira un video con subtítulos y repite cada línea (shadowing) para practicar pronunciación.",
};

const STUCK_OPTIONS: { label: string; prompt: string }[] = [
  {
    label: "💡 Dame una pista",
    prompt:
      "El usuario presionó 'No sé qué decir' y pidió UNA PISTA. Da una pista pequeña para responder la pregunta actual (palabra o inicio), SIN dar la respuesta completa, y anímalo a intentar.",
  },
  {
    label: "🗝 Muéstrame palabras útiles",
    prompt:
      "El usuario pidió PALABRAS ÚTILES para responder. Da 3-4 palabras o expresiones clave en inglés (con su traducción al español) relacionadas con la pregunta actual, y pídele que intente armar una respuesta.",
  },
  {
    label: "🚀 Dame una frase inicial",
    prompt:
      "El usuario pidió una FRASE INICIAL para empezar a responder. Dale una primera frase corta en inglés que pueda usar para arrancar y pídele que continúe.",
  },
  {
    label: "👀 Muéstrame un ejemplo",
    prompt:
      "El usuario pidió un EJEMPLO. Muestra una respuesta de ejemplo completa y natural para la pregunta actual, en inglés con traducción, y luego pídele que la repita y la haga suya.",
  },
  {
    label: "🇪🇸 Explícamelo en español",
    prompt:
      "El usuario pidió una EXPLICACIÓN EN ESPAÑOL. Explica la pregunta actual y cómo responderla (qué información dar y qué palabras usar) en español, de forma breve y clara.",
  },
  {
    label: "🔁 Practiquemos esa respuesta",
    prompt:
      "El usuario quiere PRACTICAR la respuesta actual. Léela tú en inglés despacio, espera a que el usuario la repita en voz alta y luego corrígelo suave y positivamente.",
  },
];

const HINTS: { label: string; prompt: string }[] = [
  {
    label: "Pista 1",
    prompt:
      "El usuario se quedó en blanco. Da una PISTA PEQUEÑA para responder la última pregunta: la primera palabra o inicio (ej: \"I\"). Sin juzgar, con paciencia.",
  },
  {
    label: "Pista 2",
    prompt:
      "El usuario sigue sin responder. Da una PISTA MAYOR mostrando las primeras palabras (ej: \"I live...\") y pídele que complete la frase.",
  },
  {
    label: "Pista 3",
    prompt:
      "El usuario aún está en blanco. Muestra el INICIO de la respuesta correcta (ej: \"I live in...\") y pídele que la termine.",
  },
  {
    label: "Respuesta",
    prompt:
      "El usuario sigue bloqueado. Muestra la RESPUESTA COMPLETA (ej: \"I live in Chile.\") con su traducción y pídele que la repita en voz alta.",
  },
  {
    label: "Comprobar",
    prompt:
      "Haz una pregunta MUY SIMILAR a la anterior para comprobar que aprendió. Si responde, felicítalo con calma.",
  },
];

const YT_SUGGEST: { label: string; q: string; levels?: Level[] }[] = [
  { label: "🎓 IELTS Speaking", q: "IELTS speaking test sample with answers", levels: ["B1", "B2", "C1", "C2"] },
  { label: "🗣 Entrevista de trabajo", q: "job interview questions and answers in english", levels: ["A2", "B1", "B2"] },
  { label: "🐢 Inglés lento y fácil", q: "slow easy english conversation for beginners", levels: ["A1", "A2"] },
  { label: "🗣 Shadowing para principiantes", q: "shadowing english practice slow", levels: ["A1", "A2", "B1"] },
  { label: "🎬 Conversación con subtítulos", q: "english daily conversation with subtitles", levels: ["A1", "A2", "B1", "B2"] },
  { label: "🧳 Viajar / Working Holiday", q: "english for travel airport conversation", levels: ["A1", "A2", "B1"] },
  { label: "🍿 Escenas de series famosas", q: "best tv series scenes english with subtitles", levels: ["B1", "B2", "C1"] },
  { label: "🎞 Frases de películas en inglés", q: "movie scenes with english subtitles for learning", levels: ["B1", "B2", "C1"] },
  { label: "🎤 Frases célebres de discursos", q: "famous speech moments english subtitles", levels: ["B1", "B2", "C1", "C2"] },
];

const MODES: Mode[] = ["diagnostico", "entrevista", "pro", "libre", "texto"];

function buildSystemPrompt(mode: Mode, level: Level, role: string, topic: string): string {
  const base = `Eres un TUTOR PERSONAL de inglés conversacional y de entrevistas de trabajo para hispanohablantes, no una app de gramática. Tu trabajo es que el usuario pueda HABLAR SIN QUEDARSE EN BLANCO en situaciones reales. Tono: profesor particular amable, paciente y motivador. Las explicaciones y feedback van en ESPAÑOL; las frases de práctica en INGLÉS con pronunciación fácil (fonética en español leíble, ej: "can" → "kan") y traducción.

FILOSOFÍA DE CORRECCIÓN (OBLIGATORIA, en cada corrección):
1. RECONOCE el esfuerzo siempre (ej: "¡Bien! Muy buena idea.").
2. Explica el error en 1 línea, sin dramatizar.
3. Muestra la versión mejorada en inglés.
4. Pide repetirla (y usa AUDIO BREVE: di en voz SOLO la palabra problemática, UNA vez, clara).
5. CONTINÚA la conversación con la siguiente pregunta/paso. La conversación NUNCA se detiene por un error.
- NUNCA respondas solo "Incorrecto", "No" o "Mal". NUNCA hagas sentir al usuario que falló. El silencio NO es error: acompaña hasta que responda.
- Interpreta el MENSAJE COMPLETO en contexto; no te aferres a una palabra suelta. Corrige solo errores reales y valiosos (máximo 2 por respuesta).
- PRONUNCIACIÓN: evalúa el AUDIO REAL. Puntaje 0-10 y fonética fácil. Si está bien, NO la señales.
- Respeta los turnos: escucha mientras el usuario habla y solo responde cuando termina.`;

  const levelAdapt = (() => {
    if (mode === "diagnostico") return "";
    switch (level) {
      case "A1":
        return `NIVEL DEL USUARIO: A1 (principiante total).
- Nunca penalices el silencio ni los errores. Sé extra paciente y claro.
- Si el usuario se queda en blanco, ayuda PROGRESIVAMENTE en este orden: esperar unos segundos → pista pequeña (ej: "I") → pista mayor ("I live...") → inicio de la respuesta ("I live in...") → respuesta completa ("I live in Chile.") → pedir que la repita → pregunta muy similar para comprobar. (La app también puede enviarte señales de ayuda).
- Frases cortas, vocabulario básico, mucho elogio. Sin explicaciones gramaticales largas.`;
      case "A2":
        return `NIVEL DEL USUARIO: A2 (básico).
- Da solo ayudas PEQUEÑAS (palabra o inicio). NO entregues la respuesta completa inmediatamente: primero ayúdalo a intentar.
- Corrige de forma POSITIVA: ej: "Excellent. A more natural sentence is: 'I live in Chile.' Repeat it."
- Estructuras simples, vocabulario cotidiano, ritmo tranquilo.`;
      case "B1":
        return `NIVEL DEL USUARIO: B1 (intermedio).
- PERMITE errores: corrígelos solo cuando no se entienda o sea importante. Interviene únicamente si el usuario realmente no puede continuar.
- PRIORIZA la conversación fluida por encima de la corrección.`;
      case "B2":
        return `NIVEL DEL USUARIO: B2 (intermedio alto).
- INTERRUMPE LO MENOS POSIBLE. Deja que complete sus ideas.
- Corrige PRINCIPALMENTE AL FINAL (resumen breve de 1-2 errores importantes), no a mitad de frase.`;
      case "C1":
      case "C2":
        return `NIVEL DEL USUARIO: ${level} (avanzado).
- NO te enfoques en errores básicos (artículos, preposiciones obvias). NO los señales si no afectan la comprensión.
- Corrige NATURALIDAD, VOCABULARIO (expresiones idiomáticas, phrasal verbs), matices y FLUIDEZ. Da alternativas más sofisticadas cuando corresponda.
- Espera respuestas elaboradas; estimula opiniones y matices.`;
    }
  })();

  const interviewBank = (() => {
    switch (level) {
      case "A1":
        return `Banco de preguntas (nivel A1): "What's your name?", "Where are you from?", "What do you do?", "Where do you live?", "Do you like your job?". EMPIEZA siempre con estas preguntas simples y sube SOLO si el usuario responde con comodidad.`;
      case "A2":
        return `Banco de preguntas (nivel A2): "Tell me about your family", "What do you do in your free time?", "What do you do every day at work?", "Why do you want to work here?". Empieza con las más fáciles y sube de dificultad progresivamente.`;
      case "B1":
        return `Banco de preguntas (nivel B1): "Tell me about yourself", "Why do you want this job?", "What are your strengths?", "Describe your typical day at work". Empieza con "Tell me about yourself" y aumenta progresivamente la dificultad.`;
      case "B2":
        return `Banco de preguntas (nivel B2): "Tell me about a challenge you faced at work", "How do you handle pressure?", "Why should we hire you?", "Describe a time you worked in a team". Dificultad progresiva.`;
      case "C1":
        return `Banco de preguntas (nivel C1): "Describe a difficult project you managed", "Tell me about a conflict with a coworker and how you solved it", "How do you prioritize when everything is urgent?". Dificultad progresiva y preguntas de seguimiento.`;
      case "C2":
        return `Banco de preguntas (nivel C2): preguntas profundas y abstractas del puesto, dilemas éticos, decisiones estratégicas, "Tell me about a time your decision changed an outcome". Preguntas de seguimiento exigentes.`;
    }
  })();

  if (mode === "diagnostico") {
    return `${base}
MODO: DIAGNÓSTICO INICIAL (conversación de aproximadamente 5 minutos).
- Actúa como un profesor particular AMABLE. Empieza saludando y haciendo preguntas fáciles en inglés (nombre, de dónde es, qué hace).
- PACIENCIA TOTAL: el usuario puede tardar pensando, y a menudo escribe sus respuestas en el chat (eso lleva más tiempo que hablar). NUNCA te apresures ni envíes "¿sigues ahí?" ni cambies de tema por silencio. Si acabas de hacer una pregunta, espera sin intervenir hasta que el usuario responda, aunque pasen 20-30 segundos. El silencio NO significa que se quedó en blanco.
- Evalúa en silencio, SIN que el usuario lo note, estas 6 áreas: comprensión, expresión oral, pronunciación, fluidez, gramática y vocabulario.
- Sube la dificultad gradualmente (como en una entrevista leve: trabajo, gustos, planes). Cuando el usuario claramente no pueda seguir, baja de nivel y TERMINA con una pregunta que sí pueda responder para que cierre con éxito. No lo hagas sentir que falló.
- NO corrijas durante el diagnóstico: solo evalúa.
- Cuando la conversación termine (después de que el usuario responda la última pregunta o tras ~5 minutos), escribe en ESPAÑOL y EXACTAMENTE en este formato:
RESUMEN: 2-3 líneas hablando DIRECTAMENTE al usuario, en SEGUNDA PERSONA (ej: "Te va muy bien con…", "Te cuesta un poco…", "Te recomiendo practicar…"). NUNCA hables de él en tercera persona ("el usuario…", "le cuesta…"): es una conversación personal con él.
NIVEL: <tu nivel detectado, SOLO el código, por ejemplo: A2 o B1>
PLAN: 3-5 acciones de práctica concretas recomendadas para ese nivel, una por línea, en español.
- CRÍTICO: la línea "NIVEL:" debe ir sola y con el código exacto para que la aplicación la lea.
- INMEDIATAMENTE después de la línea "PLAN:", despídete en 1 línea corta y NO sigas preguntando nada más: la conversación termina ahí. La aplicación mostrará el resultado.`;
  }

  if (mode === "listening") {
    return `${base}
${levelAdapt}
MODO: ESCUCHA Y REPITE (frases de entrevista de nivel ${level}).
- El usuario te enviará la frase que debe repetir. Lee SOLO esa frase, DESPACIO y clara, y espera a que el usuario la repita en voz alta.
- NUNCA cambies de frase por tu cuenta: espera a que el usuario te pida repetir, saltar o marcar que la dijo bien.
- Tras la repetición: puntúa 0-10 con el AUDIO real, indica las palabras mal con fonética fácil, di en audio SOLO esas palabras (una vez, breve), y pídele que intente de nuevo.
- Si la dice bien: felicita y espera la instrucción. Ambiente tranquilo.`;
  }

  if (mode === "guiada") {
    return `${base}
${levelAdapt}
MODO: DIÁLOGO GUIADO (tema del usuario: "${topic}").
- JUEGO DE ROLES relajado. El usuario ve en pantalla la línea que debe decir (tarjeta "Di esto") y habla por el micrófono.
- Guíalo línea por línea: saluda, haz la primera pregunta sobre el tema "${topic}", y lleva la conversación con calma.
- Cuando el usuario diga la línea que tenía que decir, confirma brevemente y dale contexto para la siguiente.
- Si se queda sin palabras o la dice mal, aplícale la filosofía de corrección y las ayudas progresivas de su nivel. Objetivo: que se suelte y hable tranquilo.`;
  }

  if (mode === "entrevista") {
    return `${base}
${levelAdapt}
MODO: ENTREVISTA SIMULADA para el puesto de "${role}".
${interviewBank}
- Una pregunta a la vez, empezando con el saludo. La dificultad aumenta PROGRESIVAMENTE dentro de la entrevista.
- Después de cada respuesta: feedback breve (1-2 líneas) solo si hay error real, siguiendo SIEMPRE la filosofía de corrección. Continúa con la siguiente pregunta.`;
  }

  if (mode === "pro") {
    return `${base}
${levelAdapt}
MODO: ENTREVISTA PRO para el puesto de "${role}".
${interviewBank}
- Reclutador SERIO y profesional. Sin ayudas de pantalla, sin frases de apoyo.
- Entrevista completa y realista: preguntas difíciles y de SEGUIMIENTO (indaga), preguntas de comportamiento y cierre. Puedes interrumpir si es confuso.
- Corrige en voz SOLO errores que afectan la comprensión, con AUDIO BREVE (solo la palabra), sin cortar el flujo.
- Al final: despídete y resume 2-3 puntos a mejorar (español). Puntúa 0-10 el desempeño general en inglés.`;
  }

  if (mode === "ielts") {
    return `${base}
${levelAdapt}
MODO: EXAMEN IELTS SPEAKING (simulación oficial, nivel ${level}).
- Actúa como un EXAMINADOR oficial IELTS, formal y con buen ritmo.
- PARTE 1 (4-5 min): saludo y preguntas de temas cotidianos (hogar, trabajo, estudios, hobbies). Haz 2-3 preguntas naturales.
- PARTE 2 (3-4 min): entrega una TARJETA (cue card) con un tema concreto. Di textualmente: "tienes un minuto para preparar y de uno a dos minutos para hablar". Después de la respuesta larga, pasa a la Parte 3.
- PARTE 3 (4-5 min): preguntas de discusión más abstractas relacionadas con el tema de la Parte 2.
- Al terminar: puntúa de 0 a 9 las 4 bandas — Fluidez, Vocabulario, Gramática, Pronunciación (con el AUDIO real) — con 1 línea por banda y el BANDO GLOBAL (overall). Informe en español.
- Aplica la filosofía de corrección: reconoce el esfuerzo, no interrumpas durante las respuestas, corrige al final por banda.`;
  }

  if (mode === "texto") {
    return `${base}
${levelAdapt}
MODO: MI TEXTO (escritura libre).
- El usuario escribe con teclado o stylus y la app ya le corrigió la gramática por escrito. Tu rol es:
  1) LEER en voz alta, claro y despacio, el texto corregido que te envíe.
  2) Pedir que lo repita en voz alta para practicar pronunciación y fluidez.
  3) Tras su repetición: puntúa 0-10 con el AUDIO real, indica palabras mal con fonética fácil y AUDIO BREVE.
- NO corrijas gramática en voz: la corrección escrita ya está hecha. Solo pronunciación y fluidez.
- ANIMA al usuario a escribir textos cada vez MÁS LARGOS y naturales, aunque tengan errores: escribe libre, exprésate con confianza. La creatividad NO se limita.`;
  }

  if (mode === "youtube") {
    return `${base}
${levelAdapt}
MODO: SHADOWING.
- El usuario te enviará frases de un video en YouTube. Repítelas DESPACIO y con claridad, una a la vez, y espera a que el usuario las repita en voz alta.
- Después de cada repetición: puntúa 0-10 la pronunciación y fluidez con el AUDIO real, indica las palabras mal con fonética fácil y AUDIO BREVE (solo la palabra).
- No agregues contenido extra: enfócate en la frase que el usuario te envíe.`;
  }

  if (mode === "concepto") {
    return `${base}
${levelAdapt}
MODO: PRÁCTICA ENFOCADA DE UN CONCEPTO ("${topic}").
- Esta sesión es SOLO para practicar este concepto. NO cambies de tema, no saltes a otros temas ni alargues la conversación.
- Estructura:
  1) Explica en 1-2 líneas (español) cómo se usa el concepto.
  2) Haz que el usuario lo produzca: dale la frase de ejemplo y que la repita; luego hazle 2-3 preguntas simples para que use el concepto en contexto real.
  3) Corrige SOLO errores de este concepto (los del nivel ${level}); ignora otros errores no relacionados.
  4) Tras 3-4 intercambios (o cuando el usuario ya lo produjo bien sin ayuda), CIERRA la sesión.
- REGLA DE CIERRE (CRÍTICA, OBLIGATORIA):
  * En cuanto decidas cerrar, escribe EXACTAMENTE la línea "FIN DE PRÁCTICA DE CONCEPTO" y NADA MÁS en esa respuesta: solo esa línea.
  * En tu SIGUIENTE (y última) respuesta, escribe SOLO el resumen de 2 líneas en español, hablándole en segunda persona. Sin preguntas, sin ejercicios, sin repetir frases.
  * Está PROHIBIDO hacer preguntas, pedir repeticiones o seguir la conversación después del FIN. El FIN SIEMPRE va al final.
- Si el usuario intenta cambiar de tema, vuélvelo con calma a este concepto.
- Decide cerrar cuando el usuario produzca el concepto bien sin ayuda, aunque haya quedado pendiente una pregunta.`;
  }

  return `${base}
${levelAdapt}
MODO: LIBRE (el usuario guía la conversación).
- El usuario te hablará y te pedirá ayuda: "¿cómo se dice...?", "corrígeme lo que dije", "necesito decir esto en inglés", etc.
- Responde en el idioma que use el usuario (normalmente español) para explicar, y SIEMPRE muestra la frase en inglés con pronunciación fácil y traducción.
- Si practica inglés, corrígelo suave siguiendo la filosofía (solo errores reales, AUDIO BREVE, "¿Quisiste decir...?") y da 1 consejo.
- No domines: tú ayudas, el usuario decide. Tono amable y motivador.`;
}

const INITIAL_MSG: Msg = {
  role: "system",
  text: "Toca Iniciar para conectar con el entrenador. Elige tu modo y nivel arriba.",
};

type Msg = { role: "system" | "user" | "model"; text: string };

function wordTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i) => arr.indexOf(v) === i);
}

function parsePlanItems(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const idx = lines.findIndex((l) => /^PLAN/i.test(l));
  const items: string[] = [];
  if (idx >= 0) {
    for (let i = idx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) continue;
      if (/^(RESUMEN|NIVEL|PLAN)/i.test(l)) break;
      const m = l.match(/^[-*•]\s*(.*)$/) || l.match(/^\d+[.)]\s*(.*)$/);
      if (m) items.push(m[1].trim());
      else if (items.length > 0) items[items.length - 1] += " " + l;
    }
  }
  if (items.length === 0) {
    return lines
      .filter((l) => /^[-*•]\s+/.test(l))
      .map((l) => l.replace(/^[-*•]\s*/, "").trim());
  }
  return items;
}

const HW_VOCAB = [
  "i", "a", "an", "the", "my", "your", "his", "her", "our", "their", "this", "that", "these", "those",
  "is", "are", "was", "were", "am", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "will", "would", "can", "could", "should", "shall", "may", "might", "must", "need", "to", "of", "for",
  "with", "at", "on", "in", "from", "by", "about", "into", "over", "under", "and", "or", "but", "so",
  "if", "then", "than", "when", "where", "why", "what", "who", "which", "how", "not", "no", "yes",
  "good", "well", "much", "many", "more", "most", "some", "any", "all", "each", "every", "one", "two",
  "three", "first", "new", "old", "big", "small", "great", "nice", "happy", "sad", "fast", "slow",
  "job", "work", "company", "team", "school", "university", "home", "family", "friend", "people",
  "english", "spanish", "language", "help", "learn", "study", "practice", "speak", "talk", "write",
  "read", "listen", "improve", "understand", "know", "think", "want", "like", "love", "need", "feel",
  "say", "ask", "answer", "question", "interview", "experience", "years", "year", "month", "week", "day",
  "time", "today", "tomorrow", "now", "morning", "evening", "night", "breakfast", "lunch", "dinner",
  "water", "food", "work", "live", "lived", "working", "living", "travel", "trip", "visit",
  "car", "house", "city", "country", "street", "hotel", "manager", "colleague", "boss", "client",
  "customer", "service", "product", "quality", "detail", "problem", "solution", "meeting", "email", "phone",
  "money", "price", "salary", "cost", "buy", "sell", "give", "get", "take", "make", "create", "start",
  "finish", "end", "continue", "stop", "change", "move", "come", "go", "see", "look", "show", "tell",
  "use", "way", "thing", "things", "life", "place", "part", "reason", "woman", "man",
  "child", "children", "name", "number", "word", "letter", "book", "paper", "pen", "pencil", "note",
  "idea", "plan", "goal", "dream", "future", "present", "past", "important", "difficult", "easy",
  "beautiful", "interesting", "boring", "wonderful", "different", "same", "together", "always", "never",
  "often", "usually", "sometimes", "really", "very", "too", "also", "because", "before", "after", "while",
  "however", "maybe", "perhaps", "please", "sorry", "thank", "thanks", "hello", "goodbye", "nice", "meet",
  "excuse", "wait", "again", "correct", "wrong", "true", "false", "ok",
  "sure", "ready", "begin", "first", "last", "next", "final", "early", "late", "hard", "soft",
  "strong", "weak", "quick", "quickly", "slowly", "carefully", "easily", "finally",
  "probably", "certainly", "definitely", "almost", "enough", "ever", "still", "yet", "already",
  "soon", "somewhere", "anywhere", "everywhere", "nothing", "something", "everything",
  "anything", "everyone", "someone", "anyone", "nobody", "somebody", "everybody", "either", "neither",
  "both", "only", "just", "quite", "rather", "pretty", "far", "near", "here", "there", "inside",
  "outside", "behind", "beside", "between", "around", "through", "across", "along", "down", "up", "off",
  "out", "away", "back", "even",
];

let recognizerPromise: Promise<any> | null = null;
async function getRecognizer(): Promise<any> {
  if (recognizerPromise) return recognizerPromise;
  recognizerPromise = (async () => {
    // @ts-ignore
    const mod: any = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.14/+esm");
    const { FilesetResolver, HandwritingRecognizer } = mod;
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    try {
      return await HandwritingRecognizer.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/handwriting_recognizer/handwriting_recognizer/float16/1/handwriting_recognizer.task",
        },
        hmmParams: { vocabulary: HW_VOCAB },
      });
    } catch {
      return await HandwritingRecognizer.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/handwriting_recognizer/handwriting_recognizer/float16/1/handwriting_recognizer.task",
        },
      });
    }
  })();
  return recognizerPromise;
}

function extractYtId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(url.trim()) ? url.trim() : "";
}

function loadYTAPI(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.YT && w.YT.Player) return resolve();
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  });
}

function Highlighted({ text, spoken }: { text: string; spoken: Set<string> }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((t, i) => {
        const w = wordTokens(t)[0];
        return w && spoken.has(w) ? (
          <span key={i} className="hilt">
            {t}
          </span>
        ) : (
          <span key={i}>{t}</span>
        );
      })}
    </>
  );
}

export default function InterviewTrainer({
  initialMode,
  compact,
  starterPrompt,
  onDiagnostic,
  onDiagnosticComplete,
  onConceptComplete,
  planStats,
  targetConcepts,
  recentErrors,
  topicOverride,
  diagnosticEnabled = true,
  onLatency,
}: {
  initialMode?: Mode;
  compact?: boolean;
  starterPrompt?: string;
  onDiagnostic?: (level: Level) => void;
  onDiagnosticComplete?: () => void;
  onConceptComplete?: () => void;
  planStats?: import("@/lib/learner").PlanStats;
  targetConcepts?: string[];
  recentErrors?: { wrong: string; right?: string; type: string; context?: string }[];
  topicOverride?: string;
  diagnosticEnabled?: boolean;
  onLatency?: (ms: number, mode: "voice" | "text") => void;
}) {
  const [level, setLevel] = useState<Level>(() => {
    try {
      const saved = localStorage.getItem("it_level");
      if (saved && ["A1", "A2", "B1", "B2", "C1", "C2"].includes(saved)) return saved as Level;
    } catch {}
    return "A2";
  });
  const [levelSet, setLevelSet] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("it_level");
    } catch {
      return false;
    }
  });
  const [plan, setPlan] = useState<string>(() => {
    try {
      return localStorage.getItem("it_plan") || "";
    } catch {
      return "";
    }
  });
  const [planDone, setPlanDone] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("it_plan_done");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [planOpen, setPlanOpen] = useState(true);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [diagDone, setDiagDone] = useState(false);
  const [practiceDone, setPracticeDone] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode ?? "diagnostico");
  const [role, setRole] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "ready">("idle");
  const [muted, setMuted] = useState(false);
  const [rec, setRec] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MSG]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [guiLines, setGuiLines] = useState<Line[]>([]);
  const [guiIdx, setGuiIdx] = useState(0);
  const [doneLines, setDoneLines] = useState<number[]>([]);
  const [phraseQueue, setPhraseQueue] = useState<Line[]>(PHRASES.A2);
  const [lastUserTurn, setLastUserTurn] = useState("");
  const [err, setErr] = useState("");
  const [myText, setMyText] = useState("");
  const [correctLoading, setCorrectLoading] = useState(false);
  const [corrected, setCorrected] = useState("");
  const [correctEs, setCorrectEs] = useState("");
  const [correctNotes, setCorrectNotes] = useState<{ before: string; after: string; why: string }[]>([]);
  const [correctTips, setCorrectTips] = useState<string[]>([]);
  const [hwLoading, setHwLoading] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytId, setYtId] = useState("");
  const [ytLines, setYtLines] = useState<{ text: string; start: number; duration: number }[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [ytActive, setYtActive] = useState(-1);
  const [ytOffset, setYtOffset] = useState(0);
  const ytOffsetRef = useRef(0);
  useEffect(() => {
    ytOffsetRef.current = ytOffset;
  }, [ytOffset]);
  const [ytQuery, setYtQuery] = useState("");
  const [ytSearching, setYtSearching] = useState(false);
  const [ytResults, setYtResults] = useState<{ id: string; title: string; author: string; durationText: string; thumb: string }[]>([]);
  const [prog, setProg] = useState<Prog>(() => {
    try {
      const raw = localStorage.getItem("it_progress");
      if (raw) {
        const p = JSON.parse(raw);
        return { done: p.done || {}, lastDay: p.lastDay || "", streak: p.streak || 0, sessions: p.sessions || 0 };
      }
    } catch {}
    return { done: {}, lastDay: "", streak: 0, sessions: 0 };
  });

  const listRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef(status);
  const messagesRef = useRef<Msg[]>([]);
  const clientRef = useRef<LiveClient | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const penUpTimer = useRef<number | null>(null);
  const autoConvertRef = useRef<() => void>(() => {});
  const disconnectRef = useRef<() => void>(() => {});
  const loadGuiadaRef = useRef<() => void>(() => {});
  const ytLinesRef = useRef(ytLines);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const firstModeRef = useRef(true);
  const hintStepRef = useRef(0);
  const coachDoneAtRef = useRef<number | null>(null);
  const latencyModeRef = useRef<"voice" | "text">("voice");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    ytLinesRef.current = ytLines;
  }, [ytLines]);

  useEffect(() => {
    setPhraseQueue(PHRASES[level]);
    setLastUserTurn("");
  }, [level]);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    return () => {
      disconnectRef.current();
    };
  }, []);

  useEffect(() => {
    setGuiLines([]);
    setGuiIdx(0);
    setDoneLines([]);
    setSuggestions([]);
    setLastUserTurn("");
    setMyText("");
    setCorrected("");
    setCorrectEs("");
    setCorrectNotes([]);
    setCorrectTips([]);
    setYtLines([]);
    setYtActive(-1);
    setYtError("");
    setYtId("");
    setYtResults([]);
    setYtQuery("");
    setMessages([INITIAL_MSG]);
    messagesRef.current = [INITIAL_MSG];
    if (mode === "texto") setYtUrl("");
    setRec(false);
    setTyping(false);
  }, [mode]);

  useEffect(() => {
    if (firstModeRef.current) {
      firstModeRef.current = false;
      return;
    }
    if (statusRef.current === "ready" || statusRef.current === "connecting") {
      disconnectRef.current();
    }
  }, [mode]);

  const pushMessage = useCallback((role: Msg["role"], text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
  }, []);

  const appendTranscript = useCallback(
    (role: "user" | "model", text: string) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role) {
          const copy = [...prev];
          copy[copy.length - 1] = { ...last, text: last.text + text };
          return copy;
        }
        return [...prev, { role, text }];
      });
    },
    []
  );

  useEffect(() => {
    const t = setInterval(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 250);
    return () => clearInterval(t);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_MSG]);
    messagesRef.current = [INITIAL_MSG];
    setLastUserTurn("");
  }, []);

  const connect = useCallback(async () => {
    if (statusRef.current === "connecting" || statusRef.current === "ready") return;
    setErr("");
    setStatus("connecting");
    setMessages([INITIAL_MSG]);
    messagesRef.current = [INITIAL_MSG];
    setRec(false);
    setLastUserTurn("");
    let cfg: { key: string; model: string; voice: string };
    try {
      const res = await fetch("/api/config");
      cfg = await res.json();
    } catch {
      setErr("No se pudo cargar la configuración.");
      setStatus("idle");
      return;
    }

    let engine = engineRef.current;
    if (!engine) {
      engine = new AudioEngine();
      await engine.init();
      await engine.resume();
      engineRef.current = engine;
    }

    const client = new LiveClient({
      onSetupComplete: () => {
        setStatus("ready");
        pushMessage(
          "system",
          "Sesión iniciada. Toca el micrófono para hablar y tócalo otra vez cuando termines: solo entonces el entrenador responde. La transcripción muestra LO QUE EL ENTRENADOR ENTENDIÓ."
        );
        if (starterPrompt) {
          client.sendText(starterPrompt);
        } else if (mode === "concepto") {
          const targetC = targetConcepts?.[0];
          const plan = targetC ? buildPractice(targetC, "daily_life") : null;
          if (plan) {
            client.sendText(plan.coachPrompt);
          } else {
            const conceptInfo = targetC ? conceptById(targetC) : null;
            const conceptName = conceptInfo?.name || topicOverride || topic || "el concepto seleccionado";
            client.sendText(
              `PRÁCTICA DE CONCEPTO. Explica brevemente en español cómo usar "${conceptName}". ` +
              `Luego hazle 2-3 preguntas simples en inglés en situaciones cotidianas para que lo produzca. ` +
              `Corrige SOLO errores de este concepto y cuando lo logre di "FIN DE PRÁCTICA DE CONCEPTO".`
            );
          }
        } else {
          const p = PHRASES[level][0];
          client.sendText(
            mode === "listening"
              ? `MODO ESCUCHA. Lee esta frase DESPACIO y con claridad: "${p.en}". Espera a que el usuario la repita.`
              : mode === "guiada"
              ? `Empieza el diálogo guiado sobre "${topic}". Saluda en inglés y haz tu primera pregunta para que el usuario diga su primera línea.`
              : mode === "pro"
              ? "Comienza la entrevista Pro para el puesto. Inicia con el saludo."
              : mode === "ielts"
              ? "Comienza el examen IELTS Speaking. Preséntate y haz la primera pregunta de la Parte 1."
              : mode === "texto"
              ? "Hola. Estoy listo para leer tu texto en voz alta. Cuando lo tengas corregido, me lo envías y lo leo despacio."
              : mode === "youtube"
              ? "Hola. Estoy listo para practicar shadowing: elige una línea del video y dale a 'Repite'."
              : mode === "libre"
              ? "Empieza el modo libre: saluda y pregúntale en español en qué le puedes ayudar hoy."
              : mode === "diagnostico"
              ? "Empieza el diagnóstico inicial: saluda en inglés y haz la primera pregunta fácil (nombre, de dónde es). Evalúa sin que se note."
              : "Empieza la entrevista: saluda en inglés y haz tu primera pregunta."
          );
        }
        if (mode === "guiada" && topic.trim()) {
          loadGuiadaRef.current();
        }
      },
      onAudio: (data, mimeType) => engine.enqueuePcmAudio(data, mimeType),
      onInputTranscription: (text) => {
        if (coachDoneAtRef.current != null && text.trim()) {
          const latency = Date.now() - coachDoneAtRef.current;
          coachDoneAtRef.current = null;
          onLatency?.(latency, latencyModeRef.current);
        }
        appendTranscript("user", text);
        setTyping(false);
        setLastUserTurn((prev) => (prev ? prev + " " : "") + text);
      },
      onOutputTranscription: (text) => {
        setTyping(true);
        appendTranscript("model", text);
      },
      onTurnComplete: () => {
        setTyping(false);
        // Marca el fin del turno del coach para medir latencia de respuesta.
        const hadModelOutput = messagesRef.current.some((m) => m.role === "model" && m.text.trim());
        if (hadModelOutput) coachDoneAtRef.current = Date.now();
        if (mode === "diagnostico") {
          const msgs = messagesRef.current;
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role !== "model") continue;
            const m = msgs[i].text.match(/NIVEL[^\n]{0,60}?([A-C][12])/i);
            if (m) {
              const lv = m[1].toUpperCase() as Level;
              setLevel(lv);
              setLevelSet(true);
              try {
                localStorage.setItem("it_level", lv);
              } catch {}
              setPlan(msgs[i].text);
              try {
                localStorage.setItem("it_plan", msgs[i].text);
              } catch {}
              setPlanDone([]);
              try {
                localStorage.setItem("it_plan_done", "[]");
              } catch {}
              setDiagDone(true);
              onDiagnostic?.(lv);
            }
            break;
          }
        }
        if (mode === "concepto") {
          const msgs = messagesRef.current;
          const found = [...msgs]
            .reverse()
            .some((m) => m.role === "model" && /FIN DE PRÁCTICA DE CONCEPTO/i.test(m.text));
          if (found) setPracticeDone(true);
        }
      },
      onInterrupted: () => setTyping(false),
      onError: (message) => setErr(message),
      onClose: () => {
        setStatus("idle");
        setRec(false);
        setTyping(false);
        engine.setCapturing(false);
        engine.stopMic();
        clientRef.current = null;
      },
    });

    clientRef.current = client;
    engine.setCapturing(false);
    try {
      await engine.startMic((base64) => client.sendRealtimeAudio(base64));
      engine.setCapturing(false);
    } catch {
      setErr("No se pudo acceder al micrófono. Revisa el permiso del navegador.");
    }
    const kgNote = (() => {
      const parts: string[] = [];
      if (targetConcepts?.length) {
        const names = targetConcepts.map((c) => conceptById(c)?.name || c).join(", ");
        parts.push(
          `CONCEPTOS EN ENTRENAMIENTO (úsalos en tus preguntas y enfócate en que los produzca sin ayuda): ${names}.`
        );
      }
      if (recentErrors?.length) {
        const errs = recentErrors
          .slice(0, 3)
          .map((e) => `${e.wrong} → ${e.right || "corregir"} (${e.type}, contexto: ${e.context || "general"})`)
          .join(" | ");
        parts.push(
          `ERRORES RECIENTES QUE DEBE EVITAR (si vuelven a aparecer, corrígelos con la filosofía y haz que repita): ${errs}`
        );
      }
      return parts.length ? `\n\nCONTEXTO DEL TUTOR (obligatorio):\n${parts.join("\n")}` : "";
    })();
    const effTopic = topicOverride || topic;
    client.connect(cfg.key, cfg.model, buildSystemPrompt(mode, level, role, effTopic) + kgNote, cfg.voice);
  }, [mode, level, role, topic, topicOverride, pushMessage, appendTranscript, targetConcepts, recentErrors]);

  const disconnect = useCallback(async () => {
    setStatus("idle");
    setRec(false);
    setTyping(false);
    clientRef.current?.close();
    clientRef.current = null;
    const engine = engineRef.current;
    engine?.setCapturing(false);
    engine?.stopMic();
    engine?.stopPlayback();
  }, []);

  useEffect(() => {
    disconnectRef.current = disconnect;
  });

  useEffect(() => {
    if (diagDone && status === "ready") {
      const t = setTimeout(() => disconnect(), 250);
      return () => clearTimeout(t);
    }
  }, [diagDone, status, disconnect]);

  useEffect(() => {
    if (practiceDone && status === "ready") {
      const t = setTimeout(() => disconnect(), 250);
      return () => clearTimeout(t);
    }
  }, [practiceDone, status, disconnect]);

  const toggleMic = useCallback(async () => {
    if (statusRef.current !== "ready") return;
    const client = clientRef.current;
    const engine = engineRef.current;
    if (!client || !engine) return;
    if (!rec) {
      setInputMode("voice");
      latencyModeRef.current = "voice";
      setRec(true);
      engine.setCapturing(true);
      try {
        await client.sendActivityStart();
      } catch (e) {
        setErr(String(e));
      }
    } else {
      setRec(false);
      try {
        await client.sendActivityEnd();
      } catch (e) {
        setErr(String(e));
      }
      engine.setCapturing(false);
    }
  }, [rec]);

  const sendText = useCallback(async () => {
    if (!text.trim() || statusRef.current !== "ready") return;
    const client = clientRef.current;
    if (!client) return;
    const value = text.trim();
    setText("");
    if (coachDoneAtRef.current != null) {
      const latency = Date.now() - coachDoneAtRef.current;
      coachDoneAtRef.current = null;
      onLatency?.(latency, "text");
    }
    pushMessage("user", value);
    try {
      await client.sendText(value);
    } catch (e) {
      setErr(String(e));
    }
  }, [text, pushMessage]);

  const handleTextChange = useCallback((value: string) => {
    setInputMode("text");
    setText(value);
    if (rec) {
      setRec(false);
      engineRef.current?.setCapturing(false);
      void clientRef.current?.sendActivityEnd();
    }
  }, [rec]);

  const toggleMute = useCallback(() => {
    if (statusRef.current !== "ready") return;
    setMuted((m) => {
      const next = !m;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const fetchSuggestions = useCallback(
    async (lastModel: string) => {
      if (!lastModel.trim()) return;
      setSuggestLoading(true);
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, lastModel }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    },
    [level]
  );

  const requestSuggestions = useCallback(async () => {
    const last = [...messagesRef.current].reverse().find((m) => m.role === "model");
    await fetchSuggestions(last?.text ?? "");
  }, [fetchSuggestions]);

  const useSuggestion = useCallback(
    (s: string) => {
      pushMessage("user", s);
      clientRef.current?.sendText?.(s);
      setSuggestions((prev) => prev.filter((x) => x !== s));
    },
    [pushMessage]
  );

  const loadGuiadaLines = useCallback(async () => {
    if (!topic.trim()) return;
    try {
      const res = await fetch("/api/guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, role: "", mode: "guiada", topic: topic.trim() }),
      });
      const data = await res.json();
      if (Array.isArray(data.lines) && data.lines.length) {
        setGuiLines(data.lines);
        setGuiIdx(0);
        setDoneLines([]);
      }
    } catch {
      // ignore
    }
  }, [level, topic]);

  useEffect(() => {
    loadGuiadaRef.current = loadGuiadaLines;
  });

  const advanceLine = useCallback(() => {
    if (guiLines.length === 0) return;
    const nextDone = unique([...doneLines, guiIdx]);
    setDoneLines(nextDone);
    let next = guiIdx + 1;
    if (next >= guiLines.length) {
      pushMessage("system", "🎉 ¡Completaste el diálogo! Puedes repetirlo con el micrófono.");
      next = 0;
      setDoneLines([]);
    }
    setGuiIdx(next);
    setLastUserTurn("");
  }, [guiLines, guiIdx, doneLines, pushMessage]);

  const sayLine = useCallback(
    (i: number) => {
      const l = guiLines[i];
      if (!l) return;
      pushMessage("user", l.en);
      clientRef.current?.sendText?.(l.en);
      const nextDone = unique([...doneLines, i]);
      setDoneLines(nextDone);
      let next = i + 1;
      if (next >= guiLines.length) {
        pushMessage("system", "🎉 ¡Completaste el diálogo! Puedes repetirlo con el micrófono.");
        next = 0;
        setDoneLines([]);
      }
      setGuiIdx(next);
      setLastUserTurn("");
    },
    [guiLines, doneLines, pushMessage]
  );

  const repeatPhrase = useCallback(() => {
    const p = phraseQueue[0];
    if (!p) return;
    setLastUserTurn("");
    clientRef.current?.sendText?.(`Repite la frase DESPACIO: "${p.en}". Espera a que el usuario la repita.`);
  }, [phraseQueue]);

  const skipPhrase = useCallback(() => {
    if (phraseQueue.length < 2) {
      repeatPhrase();
      return;
    }
    const next = phraseQueue[1];
    setPhraseQueue((q) => [...q.slice(1), q[0]]);
    setLastUserTurn("");
    clientRef.current?.sendText?.(`Pasemos a la siguiente frase. Léela DESPACIO: "${next.en}". Espera a que el usuario la repita.`);
  }, [phraseQueue, repeatPhrase]);

  const selectPhrase = useCallback(
    (en: string) => {
      const p = PHRASES[level].find((x) => x.en === en);
      if (!p) return;
      setPhraseQueue((q) => [p, ...q.filter((x) => x.en !== en)]);
      setLastUserTurn("");
      clientRef.current?.sendText?.(`Lee esta frase DESPACIO: "${p.en}". Espera a que el usuario la repita.`);
    },
    [level]
  );

  const saveProg = useCallback((p: Prog) => {
    try {
      localStorage.setItem("it_progress", JSON.stringify(p));
    } catch {}
    setProg(p);
  }, []);

  const markPhraseDone = useCallback(() => {
    const p = phraseQueue[0];
    if (!p) return;
    const currentDone = prog.done[level] || [];
    if (!currentDone.includes(p.en)) {
      saveProg({ ...prog, done: { ...prog.done, [level]: unique([...currentDone, p.en]) } });
    }
    setLastUserTurn("");
    if (phraseQueue.length < 2) {
      repeatPhrase();
      return;
    }
    const next = phraseQueue[1];
    setPhraseQueue((q) => [...q.slice(1), q[0]]);
    clientRef.current?.sendText?.(`El usuario dijo bien la frase anterior. Pasemos a la siguiente. Léela DESPACIO: "${next.en}". Espera a que la repita.`);
  }, [phraseQueue, prog, level, saveProg, repeatPhrase]);

  const resetLevel = useCallback(() => {
    saveProg({ ...prog, done: { ...prog.done, [level]: [] } });
  }, [prog, level, saveProg]);

  const changeLevel = useCallback((l: Level) => {
    setLevel(l);
    setLevelSet(true);
    try {
      localStorage.setItem("it_level", l);
    } catch {}
  }, []);

  const stuckHelp = useCallback(
    (label: string, prompt: string) => {
      setStuckOpen(false);
      pushMessage("user", "🤔 No sé qué decir");
      pushMessage("system", `🚀 Ayuda solicitada: ${label}`);
      clientRef.current?.sendText?.(prompt);
    },
    [pushMessage]
  );

  const togglePlanItem = useCallback((item: string) => {
    setPlanDone((prev) => {
      const has = prev.includes(item);
      const next = has ? prev.filter((x) => x !== item) : [...prev, item];
      try {
        localStorage.setItem("it_plan_done", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetPlanDone = useCallback(() => {
    setPlanDone([]);
    try {
      localStorage.setItem("it_plan_done", "[]");
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== "ready" || rec || inputMode !== "voice") return;
    if (level !== "A1" && level !== "A2") return;
    if (!["guiada", "entrevista", "pro", "libre", "concepto", "ielts", "diagnostico"].includes(mode)) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "model") return;
    if (text.trim().length > 0) return; // el usuario está escribiendo: nunca apresurar
    const maxStep = level === "A1" ? 4 : 2;
    const delay = mode === "diagnostico" ? 26000 : level === "A1" ? 12000 : 18000;
    const t = window.setTimeout(() => {
      const hint = HINTS[Math.min(hintStepRef.current, maxStep)];
      pushMessage("system", `💡 ${hint.label} (ayuda automática)`);
      clientRef.current?.sendText?.(hint.prompt);
      hintStepRef.current += 1;
    }, delay);
    return () => clearTimeout(t);
  }, [messages, status, rec, inputMode, mode, level, pushMessage, text]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "user") hintStepRef.current = 0;
  }, [messages]);

  useEffect(() => {
    if (rec) hintStepRef.current = 0;
  }, [rec]);

  useEffect(() => {
    if (status !== "ready") return;
    const today = new Date().toISOString().slice(0, 10);
    if (prog.lastDay === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = prog.lastDay === yesterday ? prog.streak + 1 : 1;
    saveProg({ ...prog, lastDay: today, streak, sessions: prog.sessions + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const correctText = useCallback(async () => {
    if (!myText.trim()) return;
    setCorrectLoading(true);
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, text: myText }),
      });
      const data = await res.json();
      if (data.error) {
        setErr(data.error);
        return;
      }
      setCorrected(data.corrected || "");
      setCorrectEs(data.es || "");
      setCorrectNotes(data.notes || []);
      setCorrectTips(data.tips || []);
    } catch {
      setErr("Error corrigiendo el texto.");
    } finally {
      setCorrectLoading(false);
    }
  }, [myText, level]);

  const readText = useCallback(async () => {
    if (!corrected || statusRef.current !== "ready") return;
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.sendText(`Lee en voz alta, claro y despacio, este texto. Después pídeme que lo repita: """${corrected}"""`);
    } catch (e) {
      setErr(String(e));
    }
  }, [corrected]);

  const setupCanvas = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    cv.width = rect.width * dpr;
    cv.height = rect.height * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#10162b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (mode === "texto") {
      const t = setTimeout(setupCanvas, 80);
      return () => clearTimeout(t);
    }
  }, [mode, setupCanvas]);

  const canvasPos = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPenDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const cv = canvasRef.current;
      if (!cv) return;
      if (penUpTimer.current) {
        clearTimeout(penUpTimer.current);
        penUpTimer.current = null;
      }
      drawingRef.current = true;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const p = canvasPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.1, p.y + 0.1);
      ctx.stroke();
    },
    [canvasPos]
  );

  const onPenMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const p = canvasPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [canvasPos]
  );

  const onPenUp = useCallback(() => {
    drawingRef.current = false;
    if (penUpTimer.current) clearTimeout(penUpTimer.current);
    penUpTimer.current = window.setTimeout(() => {
      autoConvertRef.current();
    }, 1400);
  }, []);

  const clearCanvas = useCallback(() => {
    setupCanvas();
  }, [setupCanvas]);

  const convertHandwriting = useCallback(async () => {
    const cv = canvasRef.current;
    if (!cv) return;
    setHwLoading(true);
    try {
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
      const recognizer = await getRecognizer();
      const result = recognizer.recognize(imgData);
      const text = String(result?.text || "").trim();
      if (text) {
        setMyText((prev) => (prev ? prev + " " : "") + text);
        clearCanvas();
      } else {
        setErr("No se detectó texto. Escribe más grande y claro.");
      }
    } catch {
      setErr("No se pudo reconocer la escritura local. Puedes escribirla con el teclado.");
    } finally {
      setHwLoading(false);
    }
  }, [clearCanvas]);

  useEffect(() => {
    autoConvertRef.current = convertHandwriting;
  });

  const searchYt = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setYtSearching(true);
    setYtError("");
    try {
      const res = await fetch(`/api/ytsearch?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.videos && data.videos.length) {
        setYtResults(data.videos);
      } else {
        setYtError(data.error || "Sin resultados para esa búsqueda.");
      }
    } catch {
      setYtError("Error buscando videos.");
    } finally {
      setYtSearching(false);
    }
  }, []);

  const fetchTranscriptFor = useCallback(async (id: string) => {
    setYtLoading(true);
    setYtError("");
    try {
      const res = await fetch(`/api/transcript?url=${encodeURIComponent("https://youtu.be/" + id)}`);
      const data = await res.json();
      if (data.lines && data.lines.length) {
        setYtLines(data.lines);
      } else {
        setYtError(data.error || "Este video no tiene subtítulos disponibles.");
      }
    } catch {
      setYtError("Error cargando los subtítulos.");
    } finally {
      setYtLoading(false);
    }
  }, []);

  const pickVideo = useCallback(
    (id: string) => {
      setYtId(id);
      setYtActive(-1);
      setYtLines([]);
      fetchTranscriptFor(id);
    },
    [fetchTranscriptFor]
  );

  const loadTranscript = useCallback(async () => {
    const id = extractYtId(ytUrl);
    if (!id) {
      setYtError("URL de YouTube no válida.");
      return;
    }
    setYtId(id);
    fetchTranscriptFor(id);
  }, [ytUrl, fetchTranscriptFor]);

  useEffect(() => {
    if (!ytId) return;
    let cancelled = false;
    (async () => {
      await loadYTAPI();
      if (cancelled) return;
      const yt = (window as any).YT;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
      playerReadyRef.current = false;
      playerRef.current = new yt.Player("yt-player", {
        videoId: ytId,
        playerVars: { rel: 0, autoplay: 1, controls: 1 },
        onReady: () => {
          playerReadyRef.current = true;
        },
      });
    })();
    const timer = setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
const cur = p.getCurrentTime();
      const off = ytOffsetRef.current;
      let idx = -1;
      for (let i = 0; i < ytLinesRef.current.length; i++) {
        const l = ytLinesRef.current[i];
        if (cur >= l.start + off - 0.25 && cur <= l.start + off + l.duration + 0.25) {
          idx = i;
          break;
        }
      }
      setYtActive(idx);
      if (idx >= 0) {
        const el = document.getElementById(`yt-line-${idx}`);
        if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ytId]);

  const seekTo = useCallback((start: number) => {
    const p = playerRef.current;
    if (!p) return;
    const seek = () => {
      if (p.seekTo) {
        p.seekTo(start, true);
      }
      if (p.playVideo) p.playVideo();
    };
    if (playerReadyRef.current) {
      seek();
      return;
    }
    // espera a que el player esté listo reintentando
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (playerReadyRef.current || tries > 25) {
        clearInterval(iv);
        if (playerReadyRef.current) seek();
      }
    }, 200);
  }, []);

  const practiceLine = useCallback((ltext: string) => {
    if (statusRef.current !== "ready" || !ltext) return;
    clientRef.current?.sendText?.(`Repite después de mí, DESPACIO, esta frase del video: "${ltext}". Espera a que la repita.`);
  }, []);

  const currentPhrase = phraseQueue[0];
  const doneSet = useMemo(() => new Set(prog.done[level] || []), [prog, level]);
  const doneCount = doneSet.size;
  const totalCount = PHRASES[level].length;
  const planItems = useMemo(() => parsePlanItems(plan), [plan]);
  const planPct = planItems.length
    ? Math.round(
        (planItems.filter((it) => (planStats ? planItemStatus(it, planStats).done : planDone.includes(it))).length /
          planItems.length) *
          100
      )
    : 0;
  const currentLine = guiLines[guiIdx];
  const targetEn = mode === "listening" ? currentPhrase?.en : mode === "guiada" ? currentLine?.en : "";
  const spokenSet = useMemo(() => new Set(wordTokens(lastUserTurn)), [lastUserTurn]);
  const lastCoachText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "model") return messages[i].text;
    }
    return "";
  }, [messages]);

  useEffect(() => {
    if (mode !== "guiada" || !currentLine) return;
    const info = wordTokens(currentLine.en);
    if (info.length === 0) return;
    let matched = 0;
    for (const w of info) if (spokenSet.has(w)) matched++;
    if (matched >= info.length) {
      const t = setTimeout(() => advanceLine(), 2500);
      return () => clearTimeout(t);
    }
  }, [mode, currentLine, spokenSet, advanceLine]);

  return (
    <div className="app">
      {!compact && (
        <header className="header">
          <h1>🎯 Tu Tutor Personal de Inglés</h1>
          <p>Conversación y entrevistas de trabajo, adaptado a tu nivel (A1–C2). Practica sin quedarte en blanco.</p>
          <div className="header-badges">
            <span className={`level-pill ${levelSet ? "set" : ""}`}>
              {levelSet ? `Nivel detectado: ${level}` : "Nivel sin definir"}
            </span>
            {prog.streak > 0 && (
              <span className="streak-pill" title="Días seguidos practicando">
                🔥 {prog.streak} día{prog.streak === 1 ? "" : "s"} seguidos
              </span>
            )}
          </div>
          {!levelSet && (
            <div className="diag-banner">
              🧪 <b>Todavía no sabes tu nivel real.</b> Empieza por el <b>Diagnóstico</b> (primer botón): 5 minutos de
              conversación con tu tutor y tu nivel y plan quedan listos.
            </div>
          )}
        </header>
      )}

      <div className="plan-panel">
        <div className="plan-head" onClick={() => setPlanOpen((v) => !v)}>
          <span>📋 Mi Plan de estudio</span>
          {planItems.length > 0 && planDone.length > 0 && (
            <span className="plan-prog">✓ {planDone.length}/{planItems.length}</span>
          )}
          <span className="plan-toggle">{planOpen ? "▾" : "▸"}</span>
        </div>
        {planOpen && (
          <div className="plan-body">
            {!plan ? (
              <div className="plan-note">
                Aún no tienes plan. Haz el <b>🧪 Diagnóstico</b> (primer botón) y tu tutor te generará uno
                personalizado según tu nivel y tus metas (IELTS, Working Holiday, entrevistas).
                <button className="chip-btn" onClick={() => setMode("diagnostico")}>
                  Ir al diagnóstico →
                </button>
              </div>
            ) : (
              <>
                <div className="plan-note">
                  Nivel: <b>{level}</b> · se completa automáticamente con tu práctica
                </div>
                {planItems.length > 0 && (
                  <div className="plan-progress">
                    <div className="plan-progress-bar" style={{ width: `${planPct}%` }}></div>
                  </div>
                )}
                {planItems.length > 0 ? (
                  <div className="plan-items">
                    {planItems.map((item, i) => {
                      const status = planStats ? planItemStatus(item, planStats) : { pct: 0, done: planDone.includes(item) };
                      const done = status.done;
                      return (
                        <div
                          key={i}
                          className={`plan-item ${done ? "done" : "auto"}`}
                          title={
                            done
                              ? "Completado automáticamente con tu práctica"
                              : `Avance: ${Math.round(status.pct * 100)}% · se completa con tu práctica`
                          }
                        >
                          <span className="plan-check">{done ? "✅" : "⬜"}</span>
                          <span className="plan-item-text">{item}</span>
                          {!done && planStats && <span className="plan-item-pct">{Math.round(status.pct * 100)}%</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="plan-text">
                    <ReactMarkdown>{plan}</ReactMarkdown>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {mode === "diagnostico" && diagDone && (
        <div className="diag-done-panel">
          <div className="diag-done-badge">Diagnóstico finalizado</div>
          <div className="diag-done-level">
            Tu nivel: <b>{level}</b>
          </div>
          <div className="diag-done-body">
            {planItems.length > 0 ? (
              <div className="plan-items">
                {planItems.map((item, i) => (
                  <div key={i} className="plan-item">
                    <span className="plan-check">✓</span>
                    <span className="plan-item-text">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="plan-text">
                <ReactMarkdown>{plan}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="diag-done-actions">
            <button className="start-btn" onClick={() => onDiagnosticComplete?.()}>
              Comenzar a practicar →
            </button>
            <button className="chip-btn" onClick={() => setMode("libre")}>
              Hablar libre con el tutor
            </button>
          </div>
        </div>
      )}

      {mode === "concepto" && practiceDone && (
        <div className="diag-done-panel">
          <div className="diag-done-badge">Práctica de concepto finalizada</div>
          <div className="diag-done-level">
            Concepto: <b>{topicOverride || topic}</b>
          </div>
          <div className="diag-done-body">
            <p>La sesión de práctica de este concepto terminó. Puedes volver al plan para marcar tu progreso.</p>
          </div>
          <div className="diag-done-actions">
            <button className="start-btn" onClick={() => onConceptComplete?.()}>
              Volver a Practicar →
            </button>
            <button className="chip-btn" onClick={() => setMode("libre")}>
              Seguir hablando libre
            </button>
          </div>
        </div>
      )}

      <div className="controls">
        <div className="mode-row">
          {MODES.filter((m) => m !== "diagnostico" || diagnosticEnabled).map((m) => (
            <button key={m} className={`mode-chip ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="mode-desc">{MODE_DESC[mode]}</div>
        <div className="row">
          {mode === "diagnostico" ? (
            <div className="diag-level-note">
              🧪 Nivel:{" "}
              <b>{diagDone ? `${level} (detectado)` : "midiéndose…"}</b>{" "}
              {diagDone ? "· diagnóstico completado" : "(el diagnóstico evalúa tu nivel, no puedes elegirlo aquí)"}
            </div>
          ) : (
            <select value={level} onChange={(e) => changeLevel(e.target.value as Level)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  Nivel {l}
                </option>
              ))}
            </select>
          )}
          {(mode === "guiada" || mode === "entrevista" || mode === "pro") && (
            <input
              type="text"
              placeholder={
                mode === "guiada" ? "Tema para conversar (ej: mi rutina diaria)" : "Puesto objetivo (ej: analista QA)"
              }
              value={mode === "guiada" ? topic : role}
              onChange={(e) => (mode === "guiada" ? setTopic(e.target.value) : setRole(e.target.value))}
            />
          )}
          <button
            className="start-btn"
            onClick={() => {
              if (status === "idle") connect();
              else disconnect();
            }}
            disabled={status === "connecting"}
          >
            {status === "idle" ? "▶ Iniciar" : status === "connecting" ? "Conectando…" : "■ Detener"}
          </button>
        </div>
        {status === "idle" && (
          <div className="conn-hint">
            💡 Esto solo usa el micrófono/audio (nada de esto funciona sin conexión con el coach). Las partes escritas — búsqueda de videos, corrección de texto y escritura a mano — sí funcionan sin Iniciar.
          </div>
        )}
      </div>

      {mode === "listening" && currentPhrase && (
        <div className="target-card listening-card">
          <div className="target-head">🎧 Repite esta frase</div>
          <div className="target-en">
            <Highlighted text={currentPhrase.en} spoken={spokenSet} />
          </div>
          <div className="target-pr">{currentPhrase.pr}</div>
          <div className="target-es">{currentPhrase.es}</div>
          {lastUserTurn && (
            <div className="heard">Lo que entendí: “{lastUserTurn.trim()}”</div>
          )}
          <div className="target-actions">
            <button className={rec ? "rec-btn big active" : "rec-btn big"} onClick={toggleMic} disabled={status !== "ready"}>
              {rec ? "🟥 Terminar" : "🎙 Di la frase"}
            </button>
            <button className="chip-btn good" onClick={markPhraseDone} disabled={status !== "ready"}>
              ✅ La dije bien
            </button>
            <button className="chip-btn" onClick={repeatPhrase} disabled={status !== "ready"}>
              🔁 Repetir
            </button>
            <button className="chip-btn" onClick={skipPhrase} disabled={status !== "ready"}>
              ⏭ Saltar
            </button>
          </div>
        </div>
      )}

      {mode === "listening" && (
        <div className="phrase-panel">
          <div className="phrase-title">
            🎧 Frases de entrevista nivel {level} — toca ▶ para escuchar una, léelas en voz alta
            <span className="phrase-prog">
              ✓ {doneCount} de {totalCount} dominadas
            </span>
            <button className="chip-btn reset" onClick={resetLevel} disabled={doneCount === 0}>
              ↺ Reiniciar
            </button>
          </div>
          <div className="phrase-grid">
            {phraseQueue.map((p, i) => (
              <div
                className={`phrase-card ${i === 0 ? "current" : ""} ${doneSet.has(p.en) ? "done" : ""}`}
                key={i}
              >
                <div className="phrase-en">
                  <span className="play-icon" onClick={() => selectPhrase(p.en)} title="Escuchar esta frase">
                    ▶
                  </span>
                  {p.en}
                  {doneSet.has(p.en) && <span className="done-badge" title="Dominada">✓</span>}
                </div>
                <div className="phrase-pr">{p.pr}</div>
                <div className="phrase-es">{p.es}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "guiada" && currentLine && (
        <div className="target-card">
          <div className="target-head">
            🎯 Di esto ({guiIdx + 1}/{guiLines.length})
          </div>
          <div className="target-en">
            <Highlighted text={currentLine.en} spoken={spokenSet} />
          </div>
          <div className="target-pr">{currentLine.pr}</div>
          <div className="target-es">{currentLine.es}</div>
          <div className="target-actions">
            <button className="chip-btn" onClick={advanceLine} disabled={status !== "ready"}>
              ✅ Lo dije, siguiente
            </button>
          </div>
          <div className="chips target-chips">
            {guiLines.map((l, i) => (
              <button
                key={i}
                className={`chip ${doneLines.includes(i) ? "done" : i === guiIdx ? "current" : ""}`}
                onClick={() => sayLine(i)}
                title="Clic para usar esta línea"
              >
                {doneLines.includes(i) ? "✓ " : ""}
                {l.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "texto" && (
        <div className="texto-grid">
          <div className="texto-left">
            <div className="panel">
              <div className="panel-head">
                <span className="suggest-title">✍️ Tu mensaje (mecanografía o texto del stylus)</span>
              </div>
              <textarea
                className="text-area"
                rows={5}
                value={myText}
                onChange={(e) => setMyText(e.target.value)}
                placeholder="Aquí irá tu texto: escrito a mano, tecleado o pegado…"
              />
              <div className="target-actions">
                <button className="chip-btn" onClick={correctText} disabled={correctLoading || !myText.trim()}>
                  {correctLoading ? "Corrigiendo…" : "✍️ Corregir (gramática)"}
                </button>
                <button className="chip-btn" onClick={readText} disabled={status !== "ready" || !corrected}>
                  🎧 Leerlo en voz alta
                </button>
                <button className="chip-btn" onClick={() => setMyText("")}>
                  🗑 Borrar
                </button>
              </div>
            </div>

            {corrected && (
              <div className="target-card">
                <div className="target-head">✅ Tu texto corregido (nivel {level})</div>
                <div className="corrected-en">{corrected}</div>
                {correctEs && <div className="target-es">🇪🇸 {correctEs}</div>}
                {correctNotes.length > 0 && (
                  <div className="notes">
                    {correctNotes.map((n, i) => (
                      <div className="note" key={i}>
                        <span className="note-before">❌ {n.before}</span>
                        <span className="note-after">→ ✅ {n.after}</span>
                        <span className="note-why">{n.why}</span>
                      </div>
                    ))}
                  </div>
                )}
                {correctTips.length > 0 && (
                  <div className="tips">
                    <div className="tips-title">💡 Consejos</div>
                    {correctTips.map((t, i) => (
                      <div key={i}>• {t}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {lastCoachText && (
              <div className="coach-feedback">
                <div className="target-head">🎙 Retroalimentación del entrenador</div>
                <div className="body">{lastCoachText}</div>
              </div>
            )}
          </div>

          <div className="texto-right">
            <div className="panel">
              <div className="panel-head">
                <span className="suggest-title">✍️ Escribe aquí con el stylus / dedo</span>
              </div>
              <canvas
                ref={canvasRef}
                className="hw-canvas"
                onPointerDown={onPenDown}
                onPointerMove={onPenMove}
                onPointerUp={onPenUp}
                onPointerLeave={onPenUp}
              />
              <div className="target-actions">
                <button className="chip-btn" onClick={convertHandwriting} disabled={hwLoading}>
                  {hwLoading ? "Convirtiendo…" : "🔄 Convertir a texto"}
                </button>
                <button className="chip-btn" onClick={clearCanvas} disabled={hwLoading}>
                  🗑 Borrar lienzo
                </button>
                <span className="ocr-hint">Se convierte automáticamente mientras escribes, en tu dispositivo</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {mode === "youtube" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <span className="suggest-title">🔎 Busca videos para shadowing (o por nivel)</span>
            </div>
            <div className="row">
              <input
                type="text"
                value={ytQuery}
                onChange={(e) => setYtQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchYt(ytQuery);
                }}
                placeholder="Buscar en YouTube (ej: entrevista de trabajo en inglés)"
              />
              <button className="chip-btn" onClick={() => searchYt(ytQuery)} disabled={ytSearching || !ytQuery.trim()}>
                {ytSearching ? "Buscando…" : "🔎 Buscar"}
              </button>
            </div>
            <div className="chips yt-suggest">
              {YT_SUGGEST.map((s) => (
                <button
                  key={s.label}
                  className="chip"
                  onClick={() => {
                    setYtQuery(s.q);
                    searchYt(s.q);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="row yt-urlrow">
              <input
                type="text"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="…o pega un enlace directo de YouTube (opcional)"
              />
              <button className="chip-btn" onClick={loadTranscript} disabled={ytLoading || !ytUrl.trim()}>
                {ytLoading ? "Cargando…" : "Cargar video"}
              </button>
            </div>
            {ytError && <div className="err">{ytError}</div>}
          </div>

          <div className="yt-grid">
            <div className="yt-left">
              {ytResults.length > 0 && (
                <div className="panel">
                  <div className="panel-head">
                    <span className="suggest-title">Resultados — toca uno para cargarlo</span>
                  </div>
                  <div className="yt-results">
                    {ytResults.map((v) => (
                      <div key={v.id} className="yt-result" onClick={() => pickVideo(v.id)}>
                        {v.thumb ? <img src={v.thumb} className="yt-thumb" alt="" /> : <div className="yt-thumb yt-thumb-empty">🎬</div>}
                        <div className="yt-result-info">
                          <div className="yt-result-title">{v.title}</div>
                          <div className="yt-result-meta">
                            {v.author} {v.durationText ? ` · ${v.durationText}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ytId && (
                <div className="panel">
                  <div className="yt-player-wrap">
                    <div id="yt-player"></div>
                  </div>
                  <div className="yt-hint">
                    📢 Activa los subtítulos con el botón CC. Toca una línea de la derecha para ir a esa escena.
                  </div>
                </div>
              )}

              {lastCoachText && (
                <div className="coach-feedback">
                  <div className="target-head">🎙 Retroalimentación del entrenador</div>
                  <div className="body">{lastCoachText}</div>
                </div>
              )}
            </div>

            <div className="yt-right">
              <div className="panel">
                <div className="panel-head">
                  <span className="suggest-title">
                    📝 Subtítulos ({ytLines.length} líneas)
                    {status === "ready" && <span className="yt-ready"> · entrena con 🎙</span>}
                  </span>
                  <span className="yt-sync">
                    <button
                      className="chip-btn"
                      onClick={() => setYtOffset((o) => o - 0.5)}
                      title="Retrasar subtítulos 0.5s"
                    >
                      ⏪ −0.5s
                    </button>
                    <span className="yt-sync-val">{ytOffset >= 0 ? "+" : ""}{ytOffset.toFixed(1)}s</span>
                    <button
                      className="chip-btn"
                      onClick={() => setYtOffset((o) => o + 0.5)}
                      title="Adelantar subtítulos 0.5s"
                    >
                      +0.5s ⏩
                    </button>
                  </span>
                </div>
                <div className="yt-transcript">
                  {ytLines.length === 0 && <div className="ocr-hint">Busca y carga un video para ver sus subtítulos aquí.</div>}
                  {ytLines.map((l, i) => (
                    <div className={`yt-line ${i === ytActive ? "active" : ""}`} key={i} id={`yt-line-${i}`}>
                      <span className="yt-time" onClick={() => seekTo(l.start + ytOffset)} title="Ir a este segundo">
                        {String(Math.floor((l.start + ytOffset) / 60)).padStart(2, "0")}:{String(Math.floor(l.start + ytOffset) % 60).padStart(2, "0")}
                      </span>
                      <span className="yt-text" onClick={() => seekTo(l.start + ytOffset)}>
                        {l.text}
                      </span>
                      <button
                        className="chip-btn yt-practice"
                        onClick={() => practiceLine(l.text)}
                        disabled={status !== "ready"}
                        title="Repite esta línea con el entrenador"
                      >
                        🎙
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {mode !== "listening" && mode !== "texto" && mode !== "youtube" && (
        <>
          <div className="chatbar">
            <span>💬 Conversación</span>
            <button className="clear-btn" onClick={clearChat}>
              🗑 Limpiar chat
            </button>
          </div>
          <div className="messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <span className="who">
                  {m.role === "model" ? "Entrenador" : m.role === "user" ? "Tú · lo que entendí" : "Sistema"}
                </span>
                <div className="body">
                  {m.role === "system" ? <p>{m.text}</p> : <ReactMarkdown>{m.text}</ReactMarkdown>}
                </div>
              </div>
            ))}
            {typing && (
              <div className="msg system">
                <span className="who">Sistema</span>
                <div className="body thinking">
                  <p>⏳ El entrenador está pensando…</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {(mode === "guiada" || mode === "entrevista" || mode === "libre" || mode === "ielts") && (
        <div className="panel">
          <div className="panel-head">
            <span className="suggest-title">💡 Ideas para responder</span>
            {suggestions.length > 0 && (
              <button className="x" onClick={() => setSuggestions([])}>
                ✕
              </button>
            )}
          </div>
          <div className="chips">
            <button className="chip-btn" onClick={requestSuggestions} disabled={suggestLoading || status !== "ready"}>
              {suggestLoading ? "Generando…" : "Generar ideas"}
            </button>
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => useSuggestion(s)} title="Clic para usarla">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="controls">
        <div className="row">
          <button className={rec ? "rec-btn active" : "rec-btn"} onClick={toggleMic} disabled={status !== "ready"} aria-pressed={rec}>
            {rec ? "🟥 Terminar (toca otra vez)" : "🎙 Hablar"}
          </button>
          <span className={`voice-mode-status ${inputMode === "voice" ? "selected" : ""}`}>
            {inputMode === "voice" ? "Modo voz" : "Modo texto"}
          </span>
          <button className={muted ? "mute-btn on" : "mute-btn"} onClick={toggleMute} disabled={status !== "ready"}>
            {muted ? "🔇 Silenciado" : "🔊 Sonido"}
          </button>
          {["diagnostico", "guiada", "entrevista", "pro", "libre", "concepto", "ielts"].includes(mode) && (
            <div className="stuck-wrap">
              {stuckOpen && (
                <div className="stuck-menu">
                  <div className="stuck-menu-title">🤔 ¿Te quedaste en blanco? Tu tutor te acompaña:</div>
                  {STUCK_OPTIONS.map((o) => (
                    <button
                      key={o.label}
                      className="stuck-opt"
                      onClick={() => stuckHelp(o.label, o.prompt)}
                      disabled={status !== "ready"}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
              <button className="stuck-fab" onClick={() => setStuckOpen((v) => !v)} title="No sé qué decir">
                🤔 No sé qué decir
              </button>
            </div>
          )}
        </div>
        {mode !== "listening" && mode !== "texto" && mode !== "youtube" && (
          <div className="row inputbar">
            <div className="inputbar-typing">
              <input
                type="text"
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendText();
                }}
                placeholder={status === "ready" ? "O escribe tu respuesta aquí…" : "Conecta para empezar…"}
              />
              {inputMode === "text" && <span className="typing-badge">✍️ modo texto · el tutor espera</span>}
            </div>
            <button className="send-btn" onClick={sendText} disabled={status !== "ready"}>
              Enviar
            </button>
          </div>
        )}
        {mode !== "listening" && mode !== "texto" && mode !== "youtube" && (
          <div className={`voice-activity ${rec ? "is-speaking" : ""}`} aria-live="polite">
            <div className="voice-wave" aria-hidden="true">
              {Array.from({ length: 9 }, (_, index) => <span key={index} style={{ "--wave-delay": `${index * 80}ms` } as React.CSSProperties} />)}
            </div>
            <span>{rec ? "Escuchando… habla cuando quieras" : inputMode === "text" ? "Escribe con calma o pulsa Hablar para activar el micrófono" : "Pulsa Hablar cuando estés listo"}</span>
          </div>
        )}
      </div>

      {err && (
        <div className="err">
          <span>{err}</span>
          <button className="x" onClick={() => setErr("")}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}