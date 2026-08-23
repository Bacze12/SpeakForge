// Context Engine: separa Concepto + Contexto + Objetivo.
// Cada contexto define CÓMO preguntar (objetivos) y con qué vocabulario,
// independiente del concepto gramatical. El motor combina todo de forma
// determinista; la oración conversacional real la produce el coach (IA).

export type ContextId =
  | "daily_life"
  | "work"
  | "technology"
  | "cooking"
  | "travel"
  | "shopping"
  | "sports"
  | "entertainment"
  | "finance"
  | "home"
  | "gaming"
  | "medical";

// Objetivos: funciones comunicativas reales (se alinean con FUNCTIONS).
export type ObjectiveId =
  | "introduce_myself"
  | "ask_basic_questions"
  | "talk_about_routines"
  | "describe_people_objects"
  | "express_needs_help"
  | "describe_location"
  | "talk_about_now"
  | "talk_about_past"
  | "handle_work_situations"
  | "interview_basics";

export type ContextDef = {
  id: ContextId;
  label: string; // en
  label_es: string; // es
  // Vocabulario del dominio para que el coach genere oraciones naturales.
  vocab: string[];
  // Para cada objetivo, la pregunta en español que hace producir el concepto.
  questions: Partial<Record<ObjectiveId, string>>;
  // Escenario de ejemplo que el coach usa como base (contexto_en).
  scenario: string;
};

export const CONTEXTS: ContextDef[] = [
  {
    id: "daily_life",
    label: "Daily Life",
    label_es: "Vida diaria",
    vocab: ["wake up", "breakfast", "neighborhood", "coffee", "walk", "weekend", "routine", "neighbor"],
    questions: {
      talk_about_routines: "Háblame de tu rutina diaria: qué haces normalmente.",
      describe_people_objects: "Describe a un vecino o a un objeto de tu casa.",
      talk_about_past: "Cuéntame qué hiciste el fin de semana.",
      ask_basic_questions: "Pregúntame qué hago los fines de semana.",
      describe_location: "Describe tu barrio.",
      talk_about_now: "Qué estás haciendo ahora mismo.",
    },
    scenario: "A chat with a neighbor about everyday life.",
  },
  {
    id: "work",
    label: "Work",
    label_es: "Trabajo",
    vocab: ["colleague", "meeting", "deadline", "office", "project", "manager", "report", "schedule"],
    questions: {
      handle_work_situations: "Háblame de tu trabajo: a qué te dedicas y cómo es tu día.",
      interview_basics: "Te están entrevistando: preséntate y habla de tu experiencia.",
      talk_about_routines: "Cuéntame tu rutina en el trabajo.",
      talk_about_past: "¿Qué hiciste en el trabajo la semana pasada?",
      ask_basic_questions: "Pregúntame sobre mi trabajo.",
    },
    scenario: "A workplace conversation or job interview.",
  },
  {
    id: "technology",
    label: "Technology",
    label_es: "Tecnología",
    vocab: ["app", "laptop", "bug", "software", "update", "developer", "screen", "password", "download"],
    questions: {
      talk_about_routines: "¿Qué sueles hacer con tu computadora en el día a día?",
      express_needs_help: "Necesitas ayuda con un problema de tu laptop: pídela.",
      talk_about_past: "Cuéntame un problema técnico que tuviste.",
      handle_work_situations: "Describe cómo usas la tecnología en tu trabajo.",
      describe_people_objects: "Describe un dispositivo que uses.",
    },
    scenario: "Talking about apps, computers, and software.",
  },
  {
    id: "cooking",
    label: "Cooking",
    label_es: "Cocina",
    vocab: ["recipe", "ingredient", "kitchen", "cook", "taste", "breakfast", "lunch", "oven", "salt"],
    questions: {
      talk_about_routines: "¿Qué sueles cocinar normalmente?",
      talk_about_past: "¿Qué cocinaste ayer?",
      express_needs_help: "No sabes qué cocinar: pide ayuda.",
      describe_people_objects: "Describe un plato o un ingrediente.",
      talk_about_now: "¿Qué estás cocinando ahora?",
    },
    scenario: "Talking about food, recipes, and cooking.",
  },
  {
    id: "travel",
    label: "Travel",
    label_es: "Viajes",
    vocab: ["airport", "flight", "hotel", "suitcase", "trip", "ticket", "map", "passport", "tourist"],
    questions: {
      talk_about_past: "Cuéntame de un viaje que hiciste.",
      talk_about_routines: "¿Qué haces cuando viajas?",
      ask_basic_questions: "En el aeropuerto: pregunta dónde está tu puerta.",
      describe_location: "Describe un lugar que visitaste.",
    },
    scenario: "Planning or describing a trip.",
  },
  {
    id: "shopping",
    label: "Shopping",
    label_es: "Compras",
    vocab: ["price", "store", "discount", "receipt", "buy", "size", "cash", "credit card", "cart"],
    questions: {
      ask_basic_questions: "En una tienda: pregunta el precio.",
      talk_about_routines: "¿Dónde sueles comprar?",
      talk_about_past: "¿Qué compraste la última vez?",
      describe_people_objects: "Describe algo que quieras comprar.",
    },
    scenario: "Shopping in a store or online.",
  },
  {
    id: "sports",
    label: "Sports",
    label_es: "Deportes",
    vocab: ["team", "match", "train", "player", "stadium", "win", "lose", "sport", "exercise"],
    questions: {
      talk_about_routines: "¿Qué deporte haces normalmente?",
      talk_about_past: "¿Cuál fue el último partido que viste?",
      handle_work_situations: "Habla de tu rutina de ejercicio.",
      ask_basic_questions: "Pregúntame qué deporte practico.",
    },
    scenario: "Talking about sports and exercise.",
  },
  {
    id: "entertainment",
    label: "Entertainment",
    label_es: "Entretenimiento",
    vocab: ["movie", "series", "music", "concert", "actor", "song", "episode", "ticket", "fan"],
    questions: {
      talk_about_routines: "¿Qué sueles ver o escuchar en tu tiempo libre?",
      talk_about_past: "¿Qué película o serie viste recientemente?",
      describe_people_objects: "Describe una película o a un artista.",
      ask_basic_questions: "Pregúntame qué música me gusta.",
    },
    scenario: "Talking about movies, music, and series.",
  },
  {
    id: "finance",
    label: "Finance",
    label_es: "Finanzas",
    vocab: ["budget", "salary", "save", "spend", "bank", "money", "invest", "account", "cost"],
    questions: {
      handle_work_situations: "Habla de tu sueldo y de tu presupuesto.",
      talk_about_routines: "¿Cómo administras tu dinero normalmente?",
      talk_about_past: "¿En qué gastaste dinero la semana pasada?",
      express_needs_help: "Necesitas ayuda con un trámite bancario.",
    },
    scenario: "Talking about money, budgets, and banking.",
  },
  {
    id: "home",
    label: "Home",
    label_es: "Casa",
    vocab: ["living room", "bedroom", "kitchen", "garden", "furniture", "floor", "door", "window"],
    questions: {
      describe_location: "Describe tu casa.",
      describe_people_objects: "Describe un mueble o un cuarto de tu casa.",
      talk_about_routines: "¿Qué haces en casa normalmente?",
      talk_about_past: "¿Qué hiciste en casa el fin de semana?",
    },
    scenario: "Describing your home and what you do there.",
  },
  {
    id: "gaming",
    label: "Gaming",
    label_es: "Videojuegos",
    vocab: ["player", "level", "console", "game", "match", "win", "team", "controller", "quest"],
    questions: {
      talk_about_routines: "¿Qué juegos juegas normalmente?",
      talk_about_past: "¿Qué jugaste ayer?",
      handle_work_situations: "Habla de tu equipo o de tu nivel en un juego.",
      ask_basic_questions: "Pregúntame qué juego me gusta.",
    },
    scenario: "Talking about video games and gaming.",
  },
  {
    id: "medical",
    label: "Medical",
    label_es: "Salud / médico",
    vocab: ["doctor", "appointment", "pain", "medicine", "symptom", "hospital", "headache", "prescription"],
    questions: {
      express_needs_help: "Tienes un dolor: explícale al doctor qué te pasa.",
      describe_people_objects: "Describe cómo te sientes.",
      handle_work_situations: "Pide una cita médica.",
      talk_about_past: "¿Cuándo fue la última vez que estuviste enfermo?",
    },
    scenario: "A doctor's appointment or describing how you feel.",
  },
];

export const CONTEXT_IDS: readonly ContextId[] = [
  "daily_life",
  "work",
  "technology",
  "cooking",
  "travel",
  "shopping",
  "sports",
  "entertainment",
  "finance",
  "home",
  "gaming",
  "medical",
] as const;

export function isContextId(v: unknown): v is ContextId {
  return typeof v === "string" && (CONTEXT_IDS as readonly string[]).includes(v);
}

export function contextById(id: ContextId): ContextDef | undefined {
  return CONTEXTS.find((c) => c.id === id);
}