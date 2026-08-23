import { EXTRA_CONCEPTS, LESSON_ORDER } from "./curriculum";

export type SkillKey =
  | "grammar"
  | "vocabulary"
  | "listening"
  | "speaking"
  | "pronunciation"
  | "fluency"
  | "writing"
  | "response_time";

export type GrammarConcept = {
  id: string;
  name: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  pattern: string;
  rules: string[];
  prerequisites: string[];
  functions: string[];
  common_errors: { wrong: string; right: string; why: string }[];
  examples: { en: string; pr: string; es: string }[];
  produce: { question_es: string; answer_en: string; answer_pr: string };
  skills: SkillKey[];
};

const BASE_CONCEPTS: GrammarConcept[] = [
  {
    id: "personal_pronouns",
    name: "Pronombres personales (I, you, he/she…)",
    level: "A1",
    pattern: "PRONOUN + VERB",
    rules: [
      "I, you, we, they + verbo base",
      "He, she, it + verbo con -s (en presente)",
      "Usa 'you' tanto para tú como para usted/ustedes",
    ],
    prerequisites: [],
    functions: ["introduce_myself", "describe_people_objects"],
    common_errors: [
      { wrong: "He live in Chile", right: "He lives in Chile", why: "Con he/she/it el verbo lleva -s" },
      { wrong: "Me am tired", right: "I am tired", why: "En inglés el sujeto va antes del verbo" },
    ],
    examples: [
      { en: "I am from Chile.", pr: "ai am from chile", es: "Soy de Chile." },
      { en: "She works in a hospital.", pr: "shi uorks in a jospital", es: "Ella trabaja en un hospital." },
      { en: "They are my friends.", pr: "dei ar mai frends", es: "Ellos son mis amigos." },
    ],
    produce: { question_es: "Presenta a un amigo tuyo.", answer_en: "He/She is my friend. His/her name is…", answer_pr: "ji/shi is mai frend" },
    skills: ["grammar", "speaking"],
  },
  {
    id: "to_be",
    name: "Verbo TO BE (am / is / are)",
    level: "A1",
    pattern: "SUBJECT + TO BE + COMPLEMENT",
    rules: [
      "I am / He-She-It is / You-We-They are",
      "Negación: I am not, you are not (aren't)",
      "Pregunta: Are you…? Is he…?",
    ],
    prerequisites: ["personal_pronouns"],
    functions: ["introduce_myself", "describe_people_objects", "talk_about_now", "interview_basics"],
    common_errors: [
      { wrong: "I am engineer", right: "I am an engineer", why: "Necesitas 'a/an' antes de la profesión" },
      { wrong: "She are happy", right: "She is happy", why: "She lleva 'is', no 'are'" },
    ],
    examples: [
      { en: "I am a software engineer.", pr: "ai am a sofuar enguinir", es: "Soy ingeniero de software." },
      { en: "Are you from Chile?", pr: "ar iu from chile", es: "¿Eres de Chile?" },
      { en: "This is my house.", pr: "dis is mai jaus", es: "Esta es mi casa." },
    ],
    produce: { question_es: "¿De dónde eres y qué profesión tienes?", answer_en: "I am from Chile. I am a software engineer.", answer_pr: "ai am from chile" },
    skills: ["grammar", "speaking", "response_time"],
  },
  {
    id: "there_is_are",
    name: "There is / There are",
    level: "A1",
    pattern: "THERE + IS/ARE + OBJECT + PLACE",
    rules: [
      "There is + singular (there's)",
      "There are + plural",
      "Negación: there isn't / there aren't",
    ],
    prerequisites: ["to_be"],
    functions: ["describe_location", "describe_people_objects"],
    common_errors: [
      { wrong: "Have a park in the city", right: "There is a park in the city", why: "Para existencia se usa there is/are, no have" },
      { wrong: "There is two restaurants", right: "There are two restaurants", why: "Plural → are" },
    ],
    examples: [
      { en: "There is a park near my house.", pr: "der is a park nir mai jaus", es: "Hay un parque cerca de mi casa." },
      { en: "There are two cafés in this street.", pr: "der ar tu kafeis in dis strit", es: "Hay dos cafés en esta calle." },
      { en: "There isn't a bank here.", pr: "der isnt a bank jir", es: "No hay un banco aquí." },
    ],
    produce: { question_es: "Describe tu barrio: qué hay y qué no hay.", answer_en: "There is a supermarket and there are two parks.", answer_pr: "der is a supermarkt" },
    skills: ["grammar", "vocabulary", "speaking"],
  },
  {
    id: "present_simple",
    name: "Present Simple (rutinas y hechos)",
    level: "A1",
    pattern: "SUBJECT + VERB + COMPLEMENT",
    rules: [
      "I/You/We/They + verbo base (I work)",
      "He/She/It + verbo -s (she works)",
      "Negación: do/does + not → I don't work / she doesn't work",
      "Pregunta: Do you…? / Does she…?",
    ],
    prerequisites: ["personal_pronouns"],
    functions: ["talk_about_routines", "ask_basic_questions", "handle_work_situations", "interview_basics"],
    common_errors: [
      { wrong: "He work in IT", right: "He works in IT", why: "He/She/It → verbo con -s" },
      { wrong: "I am work in IT", right: "I work in IT", why: "Para trabajo habitual se usa presente simple, no to be" },
      { wrong: "I don't like, but I like my job", right: "I like my job", why: "Evita dobles negaciones; usa una idea clara" },
    ],
    examples: [
      { en: "I work as a software engineer.", pr: "ai uork as a sofuar enguinir", es: "Trabajo como ingeniero de software." },
      { en: "She works from Monday to Friday.", pr: "shi uorks from monday tu fraidei", es: "Ella trabaja de lunes a viernes." },
      { en: "Do you speak English?", pr: "du iu spik inglish", es: "¿Hablas inglés?" },
      { en: "He doesn't drink coffee.", pr: "ji dosnt drink kofi", es: "Él no toma café." },
    ],
    produce: { question_es: "¿Qué haces normalmente en tu trabajo/día?", answer_en: "I work in IT and I usually check my emails in the morning.", answer_pr: "ai uork in it" },
    skills: ["grammar", "speaking", "fluency", "response_time"],
  },
  {
    id: "present_continuous",
    name: "Present Continuous (acciones ahora)",
    level: "A2",
    pattern: "SUBJECT + AM/IS/ARE + VERB-ING",
    rules: [
      "I am working / He is working / They are working",
      "Se usa para acciones que ocurren AHORA",
      "Pregunta: Are you working? What are you doing?",
    ],
    prerequisites: ["to_be", "present_simple"],
    functions: ["talk_about_now", "describe_people_objects"],
    common_errors: [
      { wrong: "I working", right: "I am working", why: "Falta el verbo to be (am)" },
      { wrong: "I am work", right: "I am working", why: "Con to be el verbo lleva -ing" },
    ],
    examples: [
      { en: "I am working right now.", pr: "ai am uorking rait nau", es: "Estoy trabajando ahora mismo." },
      { en: "What are you doing?", pr: "uat ar iu duing", es: "¿Qué estás haciendo?" },
      { en: "She is cooking dinner.", pr: "shi is kuking dina", es: "Ella está cocinando la cena." },
    ],
    produce: { question_es: "¿Qué estás haciendo en este momento?", answer_en: "I am talking with my tutor.", answer_pr: "ai am toking uiz mai tiutor" },
    skills: ["grammar", "speaking", "fluency"],
  },
  {
    id: "can_ability",
    name: "CAN (habilidades y permiso)",
    level: "A1",
    pattern: "SUBJECT + CAN + BASE VERB",
    rules: [
      "Can es igual para todas las personas (I can, he can)",
      "El verbo va en base, sin 'to': I can swim (no 'I can to swim')",
      "Pregunta: Can you…? · Negación: can't",
    ],
    prerequisites: ["personal_pronouns"],
    functions: ["express_needs_help", "ask_basic_questions", "handle_work_situations", "interview_basics"],
    common_errors: [
      { wrong: "I can to speak English", right: "I can speak English", why: "Después de can el verbo va sin 'to'" },
      { wrong: "He cans swim", right: "He can swim", why: "Can no cambia con he/she/it" },
    ],
    examples: [
      { en: "I can speak a little English.", pr: "ai kan spik a litel inglish", es: "Puedo hablar un poco de inglés." },
      { en: "Can you help me, please?", pr: "kan iu jelp mi plis", es: "¿Puedes ayudarme, por favor?" },
      { en: "I can't come tomorrow.", pr: "ai kant kam tumoro", es: "No puedo venir mañana." },
    ],
    produce: { question_es: "¿Qué puedes y qué no puedes hacer en tu trabajo?", answer_en: "I can code in Python and I can't work on weekends.", answer_pr: "ai kan koud in paiton" },
    skills: ["grammar", "speaking", "response_time"],
  },
  {
    id: "wh_questions",
    name: "Preguntas WH- (what, where, when…)",
    level: "A1",
    pattern: "WH + AUXILIARY + SUBJECT + BASE VERB",
    rules: [
      "What (qué) / Where (dónde) / When (cuándo) / Why (por qué) / How (cómo)",
      "Orden: Where do you work? (Where + do + you + work)",
      "Con to be: Where are you from? (sin auxiliar do)",
    ],
    prerequisites: ["to_be", "present_simple"],
    functions: ["ask_basic_questions", "handle_work_situations", "interview_basics"],
    common_errors: [
      { wrong: "Where you work?", right: "Where do you work?", why: "Las preguntas necesitan el auxiliar do" },
      { wrong: "What you doing?", right: "What are you doing?", why: "Con -ing necesitas are/is/am antes del sujeto" },
    ],
    examples: [
      { en: "Where do you work?", pr: "uer du iu uork", es: "¿Dónde trabajas?" },
      { en: "What do you do in your free time?", pr: "uat du iu du in iur fri taim", es: "¿Qué haces en tu tiempo libre?" },
      { en: "Why do you want this job?", pr: "uai du iu uant dis yob", es: "¿Por qué quieres este trabajo?" },
      { en: "How do you get to work?", pr: "jau du iu get tu uork", es: "¿Cómo llegas al trabajo?" },
    ],
    produce: { question_es: "Pregúntale a tu tutor tres cosas (dónde, cuándo, por qué).", answer_en: "Where do you work? When do you start? Why do you like it?", answer_pr: "uer du iu uork" },
    skills: ["grammar", "speaking", "response_time"],
  },
  {
    id: "prepositions_basic",
    name: "Preposiciones básicas (in, on, at)",
    level: "A1",
    pattern: "… + IN / ON / AT + PLACE·TIME",
    rules: [
      "in + ciudades, países, meses (in Chile, in May)",
      "on + días, superficies (on Monday, on the table)",
      "at + horas y puntos (at 9 o'clock, at home)",
    ],
    prerequisites: ["to_be", "there_is_are"],
    functions: ["describe_location", "talk_about_routines", "handle_work_situations"],
    common_errors: [
      { wrong: "I live at Chile", right: "I live in Chile", why: "Países y ciudades → in" },
      { wrong: "I work on Mondays at 8 o'clock", right: "I work on Mondays at 8 o'clock", why: "Correcto: on + días, at + hora" },
      { wrong: "on the morning", right: "in the morning", why: "Partes del día → in" },
    ],
    examples: [
      { en: "I live in Santiago.", pr: "ai liv in santiago", es: "Vivo en Santiago." },
      { en: "I start work at 9 o'clock.", pr: "ai start uork at nain oclok", es: "Empiezo a trabajar a las 9." },
      { en: "See you on Monday!", pr: "si iu on mondei", es: "¡Te veo el lunes!" },
    ],
    produce: { question_es: "Di dónde vives y a qué hora empiezas a trabajar.", answer_en: "I live in Santiago and I start work at 9.", answer_pr: "ai liv in santiago" },
    skills: ["grammar", "vocabulary"],
  },
  {
    id: "frequency_adverbs",
    name: "Adverbios de frecuencia (always, usually…)",
    level: "A2",
    pattern: "SUBJECT + ADVERB + VERB",
    rules: [
      "always (siempre) / usually (normalmente) / sometimes (a veces) / never (nunca)",
      "Van antes del verbo: I usually work",
      "Con to be van después: I am always happy",
    ],
    prerequisites: ["present_simple"],
    functions: ["talk_about_routines", "handle_work_situations"],
    common_errors: [
      { wrong: "I work usually", right: "I usually work", why: "El adverbio va antes del verbo" },
      { wrong: "I don't never", right: "I never", why: "No uses doble negación: never ya es negativo" },
    ],
    examples: [
      { en: "I always drink coffee in the morning.", pr: "ai olueis drink kofi in the morning", es: "Siempre tomo café en la mañana." },
      { en: "I sometimes work from home.", pr: "ai somtaims uork from jom", es: "A veces trabajo desde casa." },
      { en: "I never arrive late.", pr: "ai never araiv leit", es: "Nunca llego tarde." },
    ],
    produce: { question_es: "¿Qué haces siempre, a veces y nunca en tu rutina?", answer_en: "I always check emails and I never skip breakfast.", answer_pr: "ai olueis chek imeils" },
    skills: ["grammar", "speaking", "fluency"],
  },
  {
    id: "past_simple",
    name: "Past Simple (eventos pasados)",
    level: "A2",
    pattern: "SUBJECT + VERB-ED / IRREGULAR + COMPLEMENT",
    rules: [
      "Regulares: +ed (worked)",
      "Irregulares: went, was, had, did (hay que memorizarlos)",
      "Negación: I didn't work (no 'didn't worked')",
      "Pregunta: Did you work? Did you go?",
    ],
    prerequisites: ["present_simple"],
    functions: ["talk_about_past", "handle_work_situations", "interview_basics"],
    common_errors: [
      { wrong: "I didn't went", right: "I didn't go", why: "Después de didn't el verbo va en base" },
      { wrong: "I work yesterday", right: "I worked yesterday", why: "Ayer (pasado) → pasado simple" },
    ],
    examples: [
      { en: "I worked in a bank last year.", pr: "ai uorkt in a bank last iir", es: "Trabajé en un banco el año pasado." },
      { en: "I went to Lima on vacation.", pr: "ai uent tu lima on bakeishon", es: "Fui a Lima de vacaciones." },
      { en: "Did you study English?", pr: "did iu stadi inglish", es: "¿Estudiaste inglés?" },
    ],
    produce: { question_es: "Cuenta qué hiciste el fin de semana pasado.", answer_en: "I visited my family and we had lunch together.", answer_pr: "ai visited mai famil" },
    skills: ["grammar", "speaking", "fluency", "response_time"],
  },
];

const ALL_CONCEPTS: GrammarConcept[] = [
  ...BASE_CONCEPTS,
  ...EXTRA_CONCEPTS,
];

const CONCEPT_MAP: Record<string, GrammarConcept> = {};
for (const c of ALL_CONCEPTS) CONCEPT_MAP[c.id] = c;

export const CONCEPTS: GrammarConcept[] = LESSON_ORDER.map((id) => CONCEPT_MAP[id]).filter(Boolean) as GrammarConcept[];

export type FunctionDef = {
  id: string;
  label: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  concepts: string[];
};

export const FUNCTIONS: FunctionDef[] = [
  { id: "introduce_myself", label: "Presentarme", level: "A1", concepts: ["to_be", "personal_pronouns", "present_simple"] },
  { id: "ask_basic_questions", label: "Hacer preguntas básicas", level: "A1", concepts: ["wh_questions", "to_be", "present_simple"] },
  { id: "talk_about_routines", label: "Hablar de rutinas", level: "A1", concepts: ["present_simple", "frequency_adverbs"] },
  { id: "describe_people_objects", label: "Describir personas y objetos", level: "A1", concepts: ["to_be", "there_is_are", "personal_pronouns"] },
  { id: "express_needs_help", label: "Pedir ayuda y expresar necesidades", level: "A1", concepts: ["can_ability"] },
  { id: "describe_location", label: "Describir lugares", level: "A1", concepts: ["there_is_are", "prepositions_basic"] },
  { id: "talk_about_now", label: "Hablar de lo que pasa ahora", level: "A2", concepts: ["present_continuous", "to_be"] },
  { id: "talk_about_past", label: "Hablar de eventos pasados", level: "A2", concepts: ["past_simple"] },
  { id: "handle_work_situations", label: "Manejar situaciones de trabajo", level: "A1", concepts: ["present_simple", "wh_questions", "can_ability", "prepositions_basic"] },
  { id: "interview_basics", label: "Responder lo esencial en una entrevista", level: "A1", concepts: ["to_be", "present_simple", "wh_questions", "can_ability", "past_simple"] },
];

export const TOPICS = [
  { id: "daily_life", label: "Vida diaria" },
  { id: "work", label: "Trabajo" },
  { id: "technology", label: "Tecnología" },
  { id: "cooking", label: "Cocina" },
  { id: "travel", label: "Viajes" },
  { id: "shopping", label: "Compras" },
  { id: "sports", label: "Deportes" },
  { id: "entertainment", label: "Entretenimiento" },
  { id: "finance", label: "Finanzas" },
  { id: "home", label: "Casa" },
  { id: "gaming", label: "Videojuegos" },
];

export const SITUATIONS = [
  { id: "interview", label: "Entrevista de trabajo", level: "A1", prompt_es: "Te están entrevistando para un puesto. Responde las preguntas del entrevistador.", context_en: "A job interviewer asks you about yourself.", situation_en: "Job interview" },
  { id: "restaurant", label: "Pedir comida en un restaurante", level: "A1", prompt_es: "Estás en un restaurante. Pide tu comida y pregunta el precio.", context_en: "You order food and ask about prices.", situation_en: "At a restaurant" },
  { id: "airport", label: "En el aeropuerto", level: "A1", prompt_es: "En el aeropuerto: pregunta dónde está tu puerta y la hora de salida.", context_en: "You ask for your gate and departure time at the airport.", situation_en: "At the airport" },
  { id: "hotel", label: "En el hotel", level: "A1", prompt_es: "En la recepción del hotel: pide una habitación y pregunta el precio.", context_en: "You check in and ask about the price.", situation_en: "At the hotel" },
  { id: "meeting", label: "Reunión de trabajo", level: "A2", prompt_es: "En una reunión: presenta tu avance y pregunta qué sigue.", context_en: "You present a quick update and ask what's next.", situation_en: "Work meeting" },
  { id: "customer_support", label: "Atención al cliente", level: "A2", prompt_es: "Llamas a soporte: explica tu problema y pide ayuda.", context_en: "You explain a problem and ask for help.", situation_en: "Customer support" },
  { id: "workplace", label: "Conversación con un colega", level: "A2", prompt_es: "Habla con un colega en la cocina: pregúntale por su fin de semana.", context_en: "Small talk with a coworker.", situation_en: "At the workplace" },
  { id: "casual_talk", label: "Conversación casual", level: "A1", prompt_es: "En una fiesta: preséntate y pregunta a alguien qué le gusta hacer.", context_en: "You introduce yourself and ask about hobbies.", situation_en: "Casual conversation" },
];

export const GOALS = [
  { id: "conversation", label: "Conversación diaria" },
  { id: "interviews", label: "Entrevistas de trabajo" },
  { id: "travel", label: "Viajar / Working Holiday" },
  { id: "exam", label: "Examen (IELTS, etc.)" },
  { id: "work", label: "Trabajar en inglés" },
  { id: "academic", label: "Estudios / académico" },
];

export const INTERESTS = [
  { id: "technology", label: "Tecnología" },
  { id: "cooking", label: "Cocina" },
  { id: "gaming", label: "Videojuegos" },
  { id: "travel", label: "Viajes" },
  { id: "sports", label: "Deportes" },
  { id: "music", label: "Música" },
  { id: "movies", label: "Películas" },
  { id: "books", label: "Libros" },
  { id: "finance", label: "Finanzas" },
  { id: "food", label: "Comida" },
];

export const SITUATION_OPTIONS = SITUATIONS.map((s) => ({ id: s.id, label: s.label }));

export function conceptById(id: string): GrammarConcept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}

export function functionById(id: string): FunctionDef | undefined {
  return FUNCTIONS.find((f) => f.id === id);
}

export const LEVEL_ORDER: ("A1" | "A2" | "B1" | "B2" | "C1" | "C2")[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function levelIndex(level: GrammarConcept["level"]): number {
  return LEVEL_ORDER.indexOf(level);
}

/* ---------- Corrección determinista (sin LLM) ---------- */

export type MCQ = {
  q: string;
  options: string[];
  answer: number;
  rule: string;
  errorType: string;
};

export const MCQS: Record<string, MCQ[]> = {
  personal_pronouns: [
    {
      q: "Completa: ___ am a software engineer.",
      options: ["I", "Me", "My"],
      answer: 0,
      rule: "El sujeto va antes del verbo: I am.",
      errorType: "pronoun",
    },
  ],
  to_be: [
    {
      q: "Completa: She ___ happy.",
      options: ["am", "is", "are"],
      answer: 1,
      rule: "He / She / It → is.",
      errorType: "verb_form",
    },
    {
      q: "Completa: ___ you from Chile?",
      options: ["Is", "Are", "Am"],
      answer: 1,
      rule: "You / We / They → are.",
      errorType: "auxiliary_missing",
    },
  ],
  there_is_are: [
    {
      q: "Completa: There ___ two cafés on this street.",
      options: ["is", "are", "be"],
      answer: 1,
      rule: "Plural → there are.",
      errorType: "verb_form",
    },
  ],
  present_simple: [
    {
      q: "Completa: He ___ in IT.",
      options: ["work", "works", "working"],
      answer: 1,
      rule: "He / She / It + verbo con -s.",
      errorType: "third_person_s",
    },
    {
      q: "Completa la pregunta: ___ you speak English?",
      options: ["Does", "Do", "Are"],
      answer: 1,
      rule: "Pregunta con you → Do.",
      errorType: "auxiliary_missing",
    },
  ],
  present_continuous: [
    {
      q: "Completa: I ___ working right now.",
      options: ["am", "is", "do"],
      answer: 0,
      rule: "I am + verbo-ing.",
      errorType: "auxiliary_missing",
    },
  ],
  can_ability: [
    {
      q: "Completa: I ___ speak English.",
      options: ["can", "can to", "cans"],
      answer: 0,
      rule: "Can + verbo base (sin to).",
      errorType: "verb_form",
    },
  ],
  wh_questions: [
    {
      q: "Completa: ___ do you work?",
      options: ["Where", "When", "What"],
      answer: 0,
      rule: "Pregunta de lugar → Where.",
      errorType: "wh_word",
    },
  ],
  prepositions_basic: [
    {
      q: "Completa: I live ___ Chile.",
      options: ["at", "in", "on"],
      answer: 1,
      rule: "Países y ciudades → in.",
      errorType: "preposition",
    },
  ],
  frequency_adverbs: [
    {
      q: "Completa: I ___ work from home.",
      options: ["usually", "work usually", "usually am"],
      answer: 0,
      rule: "El adverbio va antes del verbo.",
      errorType: "word_order",
    },
  ],
  past_simple: [
    {
      q: "Completa: I ___ to Lima last year.",
      options: ["went", "go", "goed"],
      answer: 0,
      rule: "Irregular: go → went.",
      errorType: "tense",
    },
  ],
};

export const ERROR_TYPES = [
  "word_order",
  "auxiliary_missing",
  "verb_form",
  "third_person_s",
  "tense",
  "article",
  "preposition",
  "pronoun",
  "wh_word",
  "unknown_word",
  "wrong_word",
  "grammar",
];

export function classifyBuilderTap(targetWords: string[], tapped: string): { type: string; detail: string } {
  if (targetWords.includes(tapped)) {
    return { type: "word_order", detail: `"${tapped}" va en otro lugar de la frase` };
  }
  return { type: "wrong_word", detail: `"${tapped}" no es una palabra de esta frase` };
}