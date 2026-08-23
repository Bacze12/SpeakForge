import {
  CONCEPTS,
  FUNCTIONS,
  conceptById,
  levelIndex,
  type SkillKey,
} from "./knowledge";

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Profile = {
  native: string;
  target: string;
  goals: string[];
  profession: string;
  interests: string[];
  situations: string[];
};

export type Skills = Record<SkillKey, number>;

export type ConceptStat = {
  mastery: number;
  attempts: number;
  noHelp: number;
  withHelp: number;
  fails: number;
  responseMs: number;
  lastPractice: number;
  lastContext: string;
  contexts: Record<string, number>;
  errors: Record<string, number>;
};

export type Concepts = Record<string, ConceptStat>;

export type ReviewItem = {
  due: number;
  interval: number;
  ease: number;
  last: number;
};

export type Reviews = Record<string, ReviewItem>;

export type ErrorEntry = {
  id: string;
  concept: string;
  type: string;
  wrong: string;
  correct: string;
  why: string;
  context: string;
  helpUsed: number;
  attempts: number;
  date: number;
  successAfter: boolean;
};

export type Attempt = {
  concept: string;
  success: boolean;
  helpUsed: number;
  date: number;
  responseMs: number;
  context: string;
};

export type CourseState = {
  done: boolean;
  startedAt: number;
  concepts: string[];
};

export type TutorState = {
  onboarded: boolean;
  diagnosticDone: boolean;
  diagnosticAt: number;
  level: Level;
  profile: Profile | null;
  skills: Skills;
  concepts: Concepts;
  reviews: Reviews;
  errors: ErrorEntry[];
  attempts: Attempt[];
  course: Record<string, CourseState>;
  xp: number;
  goalsDone: Record<string, string[]>;
  energy: number;
  energyUpdated: number;
  bonusesUsed: Record<string, number>;
  speed?: SpeedBaselines;
};

/* ---- Velocidad de respuesta: baseline personal por modo ----
   Compara contra TU propia media (EMA con desviación), no contra umbrales
   absolutos: responder lento una vez no castiga, y respuestas largas no se
   penalizan si son normales para ti. Los primeros intentos solo recolectan. */
export type SpeedMode = "voice" | "text";
export type SpeedEma = { mu: number; sd: number; n: number };
export type SpeedBaselines = Record<SpeedMode, SpeedEma>;

export function emptySpeedEma(): SpeedEma {
  return { mu: 0, sd: 0, n: 0 };
}

export function defaultSpeed(): SpeedBaselines {
  return { voice: emptySpeedEma(), text: emptySpeedEma() };
}

export function updateSpeedBaseline(s: TutorState, mode: SpeedMode, ms: number): TutorState {
  const base = s.speed || defaultSpeed();
  const cur = base[mode] || emptySpeedEma();
  const msClamped = Math.max(300, Math.min(120000, ms));
  const n = cur.n + 1;
  const k = Math.min(1 / n, 0.25);
  const mu = n === 1 ? msClamped : cur.mu + k * (msClamped - cur.mu);
  const dev = Math.abs(msClamped - mu);
  const sd = n === 1
    ? Math.max(800, dev)
    : Math.sqrt(Math.max(640000, cur.sd * cur.sd * (1 - k) + dev * dev * k)); // floor ~0.8s²
  return { ...s, speed: { ...base, [mode]: { mu, sd, n } } };
}

export type SpeedVerdict = "collect" | "fast" | "normal" | "slow";

export function speedVerdict(ema: SpeedEma | undefined, ms: number): SpeedVerdict {
  if (!ema || ema.n < 5) return "collect";
  const z = ema.sd > 400 ? (ms - ema.mu) / ema.sd : 0;
  if (z <= -0.5) return "fast";
  if (z >= 1.5) return "slow";
  return "normal";
}

const KEY = "tutor_state";
export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const DIAGNOSTIC_COOLDOWN_MS = 30 * 86400000;

const LEVEL_BASE: Record<Level, number> = {
  A1: 0.35,
  A2: 0.48,
  B1: 0.62,
  B2: 0.76,
  C1: 0.87,
  C2: 0.95,
};

export function defaultSkills(): Skills {
  return {
    grammar: 0,
    vocabulary: 0,
    listening: 0,
    speaking: 0,
    pronunciation: 0,
    fluency: 0,
    writing: 0,
    response_time: 0,
  };
}

function newStat(mastery = 0): ConceptStat {
  return {
    mastery,
    attempts: 0,
    noHelp: 0,
    withHelp: 0,
    fails: 0,
    responseMs: 0,
    lastPractice: 0,
    lastContext: "",
    contexts: {},
    errors: {},
  };
}

export function emptyState(): TutorState {
  return {
    onboarded: false,
    diagnosticDone: false,
    diagnosticAt: 0,
    level: "A1",
    profile: null,
    skills: defaultSkills(),
    concepts: {},
    reviews: {},
    errors: [],
    attempts: [],
    course: {},
    xp: 0,
    goalsDone: {},
    energy: 5,
    energyUpdated: 0,
    bonusesUsed: {},
  };
}

export function loadState(): TutorState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Reconciliar: si InterviewTrainer ya detectó un nivel en otra sesión, marcarlo como hecho.
      const saved = localStorage.getItem("it_level");
      if (saved && (LEVELS as string[]).includes(saved)) {
        return seedFromDiagnostic(emptyState(), saved as Level);
      }
      return emptyState();
    }
    const p = JSON.parse(raw);
    const concepts: Concepts = {};
    for (const [id, v] of Object.entries(p.concepts || {})) {
      if (typeof v === "number") concepts[id] = newStat(v as number);
      else concepts[id] = { ...newStat(), ...(v as ConceptStat) };
    }
    let s: TutorState = {
      ...emptyState(),
      ...p,
      skills: { ...defaultSkills(), ...(p.skills || {}) },
      concepts,
      course: p.course || {},
      energy: typeof p.energy === "number" ? p.energy : 5,
      energyUpdated: p.energyUpdated || 0,
      bonusesUsed: p.bonusesUsed || {},
      diagnosticAt: typeof p.diagnosticAt === "number" ? p.diagnosticAt : 0,
    };
    if (!s.diagnosticDone) {
      const saved = localStorage.getItem("it_level");
      if (saved && (LEVELS as string[]).includes(saved)) {
        s = seedFromDiagnostic(s, saved as Level);
      }
    }
    return s;
  } catch {
    return emptyState();
  }
}

export function saveState(s: TutorState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function saveProfile(s: TutorState, profile: Profile) {
  saveState({ ...s, onboarded: true, profile });
}

export function canRunDiagnostic(s: TutorState, now = Date.now()): boolean {
  return (
    !s.diagnosticDone ||
    !s.diagnosticAt ||
    now - s.diagnosticAt >= DIAGNOSTIC_COOLDOWN_MS
  );
}

export function diagnosticNextDate(s: TutorState): number | null {
  if (!s.diagnosticAt) return null;
  return s.diagnosticAt + DIAGNOSTIC_COOLDOWN_MS;
}

export function seedFromDiagnostic(s: TutorState, level: Level): TutorState {
  const base = LEVEL_BASE[level];
  const demonstrated = base * 0.72;
  const skills: Skills = {
    grammar: demonstrated + 0.03,
    vocabulary: demonstrated,
    listening: demonstrated - 0.02,
    speaking: demonstrated - 0.05,
    pronunciation: demonstrated,
    fluency: demonstrated - 0.08,
    writing: demonstrated,
    response_time: demonstrated - 0.06,
  };
  const concepts: Concepts = { ...s.concepts };
  const liUser = levelIndex(level);
  for (const c of CONCEPTS) {
    const li = levelIndex(c.level);
    if (li <= liUser && !concepts[c.id]) {
      const m = liUser - li >= 2 ? 0.62 : liUser - li === 1 ? 0.45 : 0.32;
      concepts[c.id] = newStat(m);
    }
  }
  return {
    ...s,
    level,
    diagnosticDone: true,
    diagnosticAt: Date.now(),
    skills: clampSkills(skills),
    concepts,
  };
}

function clampSkills(skills: Skills): Skills {
  const out: Skills = { ...skills };
  (Object.keys(out) as SkillKey[]).forEach((k) => {
    out[k] = Math.max(0, Math.min(1, out[k]));
  });
  return out;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/* ---- XP (gamificación) ---- */

const XP_WEIGHT: Record<Level, number> = {
  A1: 10,
  A2: 14,
  B1: 18,
  B2: 22,
  C1: 26,
  C2: 30,
};

export function conceptXp(concept: { level: Level; skills: string[] }): number {
  return XP_WEIGHT[concept.level] + Math.min(4, concept.skills.length);
}

export const XP_LEVELS: number[] = [
  0, 40, 100, 180, 280, 400, 540, 700, 880, 1080,
];

export function xpLevel(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_LEVELS.length; i++)
    if (xp >= XP_LEVELS[i]) lvl = i + 1;
  return lvl;
}

export function xpLevelProgress(xp: number): { level: number; pct: number } {
  const lvl = xpLevel(xp);
  const lo = XP_LEVELS[lvl - 1];
  const hi = XP_LEVELS[lvl] ?? lo + 100;
  return {
    level: lvl,
    pct: Math.min(100, Math.round(((xp - lo) / (hi - lo)) * 100)),
  };
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function attemptsToday(s: TutorState, conceptId?: string): Attempt[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return s.attempts.filter(
    (a) => a.date >= start.getTime() && (!conceptId || a.concept === conceptId),
  );
}

export function practicedToday(s: TutorState, conceptId: string): boolean {
  return attemptsToday(s, conceptId).some((a) => a.success);
}

export function isGoalDone(s: TutorState, id: string): boolean {
  return (s.goalsDone[todayKey()] || []).includes(id);
}

export function toggleGoal(s: TutorState, id: string): TutorState {
  const key = todayKey();
  const arr = s.goalsDone[key] || [];
  const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  return { ...s, goalsDone: { ...s.goalsDone, [key]: next } };
}

/* ---- Energía y bonificaciones (gamificación) ---- */

export const MAX_ENERGY = 5;
const ENERGY_REGEN_MS = 90 * 60 * 1000; // 90 min por punto de energía

export function currentEnergy(s: TutorState): number {
  const elapsed = Date.now() - (s.energyUpdated || 0);
  const regen = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (regen <= 0) return s.energy;
  return Math.min(MAX_ENERGY, s.energy + regen);
}

export function addEnergy(s: TutorState, amount = 1): TutorState {
  const cur = currentEnergy(s);
  return {
    ...s,
    energy: Math.min(MAX_ENERGY, cur + amount),
    energyUpdated:
      s.energy >= MAX_ENERGY && cur >= MAX_ENERGY
        ? s.energyUpdated
        : Date.now(),
  };
}

export function spendEnergy(s: TutorState, amount = 1): TutorState {
  const cur = currentEnergy(s);
  return { ...s, energy: Math.max(0, cur - amount), energyUpdated: Date.now() };
}

export type Bonus = { id: string; name: string; desc: string; xp: number };

export const BONUSES: Bonus[] = [
  {
    id: "extra_listen",
    name: "🔁 +1 escucha extra",
    desc: "Reproduce el dictado una vez más por intento.",
    xp: 40,
  },
  {
    id: "deep_analysis",
    name: "🔬 +1 análisis de pronunciación",
    desc: "Un análisis extra con Gemini para tu audio.",
    xp: 80,
  },
  {
    id: "extra_exam_grammar",
    name: "📝 +2 preguntas de gramática en examen",
    desc: "Más margen para aprobar la certificación.",
    xp: 200,
  },
  {
    id: "shuffle_review",
    name: "🔀 Repaso aleatorio extra",
    desc: "Un repaso espaciado adicional hoy.",
    xp: 300,
  },
];

export function unlockedBonuses(xp: number): Bonus[] {
  return BONUSES.filter((b) => xp >= b.xp);
}

export function nextBonus(xp: number): Bonus | null {
  return (
    BONUSES.filter((b) => xp < b.xp).sort((a, b) => a.xp - b.xp)[0] || null
  );
}

export type DailyGoal = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  done: boolean;
  tab: "practice" | "review" | "voice";
  conceptId?: string;
};

export function dailyGoals(s: TutorState): DailyGoal[] {
  const goals: DailyGoal[] = [];
  const weak = weakPoints(s);
  const due = dueReviews(s, 1);

  const targetConcept =
    Object.entries(s.concepts)
      .filter(([, st]) => st.mastery < 0.7 && st.mastery > 0)
      .sort((a, b) => a[1].mastery - b[1].mastery)[0]?.[0] || nextConcept(s);

  if (targetConcept) {
    const c = conceptById(targetConcept);
    goals.push({
      id: "practice",
      icon: "🎯",
      title: `Practica: ${c?.name || targetConcept}`,
      sub: practicedToday(s, targetConcept)
        ? "Practicado hoy ✓"
        : `Dominio ${Math.round((s.concepts[targetConcept]?.mastery ?? 0) * 100)}% · márcalo dominando sin ayuda`,
      done: practicedToday(s, targetConcept),
      tab: "practice",
      conceptId: targetConcept,
    });
  }

  if (due[0]) {
    const c = conceptById(due[0].id);
    goals.push({
      id: "review",
      icon: "🔁",
      title: `Repasa: ${c?.name || due[0].id}`,
      sub: practicedToday(s, due[0].id)
        ? "Repasado hoy ✓"
        : `Dominio ${Math.round(due[0].mastery * 100)}%`,
      done: practicedToday(s, due[0].id),
      tab: "review",
      conceptId: due[0].id,
    });
  }

  const topWord = wordErrors(s)[0];
  if (topWord) {
    goals.push({
      id: "error",
      icon: "✏️",
      title: `Mejora: «${topWord.word}»`,
      sub: `${topWord.count} error(es) → ${topWord.correct || "corregir"}`,
      done: practicedToday(s, topWord.concept),
      tab: "practice",
      conceptId: topWord.concept,
    });
  }

  const situation = s.profile?.situations?.[0] || "casual_talk";
  goals.push({
    id: "situation",
    icon: "🦁",
    title: `Situación real: ${SITUATION_LABEL[situation]}`,
    sub: "15 min hablando de una situación de tu vida real",
    done: isGoalDone(s, "situation"),
    tab: "voice",
  });

  if (s.profile?.goals?.includes("interviews")) {
    goals.push({
      id: "interview",
      icon: "💼",
      title: "Entrevista de 5 minutos",
      sub: "Simula una entrevista corta con el coach",
      done: isGoalDone(s, "interview"),
      tab: "voice",
      conceptId: "entrevista",
    });
  }

  return goals;
}

const SITUATION_LABEL: Record<string, string> = {
  casual_talk: "Conversación casual",
  ordering_food: "Pedir comida",
  shopping: "Ir de compras",
  travel: "Viajar / aeropuerto",
  doctors: "Ir al médico",
  work: "Hablar de tu trabajo",
  job_interview: "Entrevista de trabajo",
  phone: "Hablar por teléfono",
};

export function wordErrors(
  s: TutorState,
): { word: string; count: number; correct: string; concept: string }[] {
  const map = new Map<
    string,
    { count: number; correct: string; concept: string }
  >();
  for (const e of s.errors) {
    const w = e.wrong.toLowerCase().trim();
    if (!w) continue;
    const cur = map.get(w) || {
      count: 0,
      correct: e.correct || "",
      concept: e.concept,
    };
    cur.count += 1;
    if (e.correct && !cur.correct) cur.correct = e.correct;
    map.set(w, cur);
  }
  const out: {
    word: string;
    count: number;
    correct: string;
    concept: string;
  }[] = [];
  map.forEach((v, w) => out.push({ word: w, ...v }));
  return out.sort((a, b) => b.count - a.count);
}

export function recordAttempt(
  s: TutorState,
  conceptId: string,
  opts: {
    success: boolean;
    helpUsed?: number;
    responseMs?: number;
    context?: string;
    wrong?: string;
    correct?: string;
    errorType?: string;
    mode?: SpeedMode;
  },
): TutorState {
  const concept = conceptById(conceptId);
  const helpUsed = opts.helpUsed ?? 0;
  const responseMs = opts.responseMs ?? 8000;
  const success = opts.success;
  const context = opts.context || "general";

  const stat = s.concepts[conceptId] || newStat();
  const curRev: ReviewItem = s.reviews[conceptId] || {
    due: 0,
    interval: 0,
    ease: 2.5,
    last: 0,
  };

  // ---- Mastery: gradual, premia recuperación independiente tras tiempo ----
  const elapsedDays = (Date.now() - stat.lastPractice) / 86400000;
  let delta: number;
  if (success) {
    delta = helpUsed === 0 ? 0.18 : helpUsed === 1 ? 0.12 : 0.06;
    if (helpUsed === 0 && elapsedDays >= 7)
      delta += 0.15; // recuperación tras semana = gran señal
    else if (helpUsed === 0 && elapsedDays >= 1) delta += 0.08; // recuperación tras días
  } else {
    delta = -0.15;
  }
  const mastery = clamp(stat.mastery + delta);

  // ---- Spaced repetition (SM-2-ish quality 0-5) ----
  const quality = success ? (helpUsed === 0 ? 5 : helpUsed === 1 ? 4 : 3) : 1;
  let { interval, ease } = curRev;
  if (quality >= 3) {
    if (interval === 0) interval = 1;
    else if (interval === 1) interval = 3;
    else interval = Math.round(interval * ease);
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;
  } else {
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  }
  const due = Date.now() + (quality >= 3 ? interval * 86400000 : 6 * 3600000);
  const reviews: Reviews = {
    ...s.reviews,
    [conceptId]: { due, interval, ease, last: Date.now() },
  };

  // ---- Concept stat update ----
  const contexts = {
    ...stat.contexts,
    [context]: (stat.contexts[context] || 0) + 1,
  };
  const errors = { ...stat.errors };
  const nextStat: ConceptStat = {
    mastery,
    attempts: stat.attempts + 1,
    noHelp: stat.noHelp + (success && helpUsed === 0 ? 1 : 0),
    withHelp: stat.withHelp + (success && helpUsed > 0 ? 1 : 0),
    fails: stat.fails + (success ? 0 : 1),
    responseMs: stat.responseMs
      ? Math.round(stat.responseMs * 0.6 + responseMs * 0.4)
      : responseMs,
    lastPractice: Date.now(),
    lastContext: context,
    contexts,
    errors,
  };
  if (!success && opts.errorType) {
    errors[opts.errorType] = (errors[opts.errorType] || 0) + 1;
  }
  const concepts: Concepts = { ...s.concepts, [conceptId]: nextStat };

  // ---- Skills update ----
  const skills: Skills = { ...s.skills };
  const targets: SkillKey[] = concept?.skills ?? ["grammar", "speaking"];
  for (const sk of targets) {
    skills[sk] = clamp((skills[sk] ?? 0) + (success ? 0.06 : -0.04));
  }
  if (opts.mode && s.speed?.[opts.mode]?.n) {
    // Baseline personal: puntúa solo velocidad relativa a ti mismo.
    const v = speedVerdict(s.speed[opts.mode], responseMs);
    if (success) {
      skills.fluency = clamp((skills.fluency ?? 0) + (v === "fast" ? 0.04 : v === "normal" ? 0.02 : 0));
      skills.response_time = clamp(
        (skills.response_time ?? 0) + (v === "fast" ? 0.05 : v === "slow" ? -0.01 : 0),
      );
    }
  } else {
    // Sin baseline suficiente: umbral fijo legacy.
    skills.fluency = clamp(
      (skills.fluency ?? 0) +
        (responseMs < 6000 ? 0.04 : responseMs > 15000 ? -0.04 : 0),
    );
    skills.response_time = clamp(
      (skills.response_time ?? 0) + (responseMs < 6000 ? 0.05 : -0.03),
    );
  }

  const attempts: Attempt[] = [
    ...s.attempts,
    {
      concept: conceptId,
      success,
      helpUsed,
      date: Date.now(),
      responseMs,
      context,
    },
  ];

  let errorsLog = s.errors;
  if (!success && opts.wrong) {
    errorsLog = [
      ...errorsLog,
      {
        id: `${Date.now()}-${conceptId}`,
        concept: conceptId,
        type: opts.errorType || "grammar",
        wrong: opts.wrong,
        correct: opts.correct || "",
        why: concept?.common_errors[0]?.why || "",
        context,
        helpUsed,
        attempts: 1,
        date: Date.now(),
        successAfter: false,
      },
    ];
  }

  const xpGained =
    success && concept
      ? Math.round(conceptXp(concept) * (helpUsed === 0 ? 1 : 0.5))
      : 0;

  const next: TutorState = {
    ...s,
    concepts,
    reviews,
    skills: clampSkills(skills),
    attempts,
    errors: errorsLog,
    xp: s.xp + xpGained,
    energy: success ? currentEnergy(s) + 1 : currentEnergy(s),
    energyUpdated: Date.now(),
  };
  // Cada intento con modo alimenta el baseline personal de velocidad.
  return opts.mode && opts.responseMs != null
    ? updateSpeedBaseline(next, opts.mode, opts.responseMs)
    : next;
}

export function recordError(
  s: TutorState,
  conceptId: string,
  opts: {
    errorType: string;
    wrong: string;
    correct?: string;
    context?: string;
  },
): TutorState {
  const concept = conceptById(conceptId);
  const context = opts.context || "general";
  const stat = s.concepts[conceptId] || newStat();
  const errors = {
    ...stat.errors,
    [opts.errorType]: (stat.errors[opts.errorType] || 0) + 1,
  };
  const concepts: Concepts = {
    ...s.concepts,
    [conceptId]: { ...stat, errors },
  };
  const entry: ErrorEntry = {
    id: `${Date.now()}-${conceptId}`,
    concept: conceptId,
    type: opts.errorType,
    wrong: opts.wrong,
    correct: opts.correct || "",
    why: concept?.common_errors[0]?.why || "",
    context,
    helpUsed: 0,
    attempts: 1,
    date: Date.now(),
    successAfter: false,
  };
  return { ...s, concepts, errors: [...s.errors, entry] };
}

export function startCourse(
  s: TutorState,
  lessonId: string,
  concepts: string[],
): TutorState {
  return {
    ...s,
    course: {
      ...s.course,
      [lessonId]: { done: false, startedAt: Date.now(), concepts },
    },
  };
}

export function completeLesson(s: TutorState, lessonId: string): TutorState {
  return {
    ...s,
    course: {
      ...s.course,
      [lessonId]: {
        done: true,
        startedAt: s.course[lessonId]?.startedAt || Date.now(),
        concepts: s.course[lessonId]?.concepts || [],
      },
    },
  };
}

export function dueReviews(
  s: TutorState,
  limit = 8,
): { id: string; mastery: number; due: number }[] {
  const now = Date.now();
  const list: { id: string; mastery: number; due: number }[] = [];
  for (const [id, r] of Object.entries(s.reviews)) {
    if (r.due <= now)
      list.push({ id, mastery: s.concepts[id]?.mastery ?? 0, due: r.due });
  }
  for (const [id, st] of Object.entries(s.concepts)) {
    if (st.mastery < 0.5 && !s.reviews[id])
      list.push({ id, mastery: st.mastery, due: 0 });
  }
  list.sort((a, b) => a.due - b.due);
  return uniqueById(list).slice(0, limit);
}

function uniqueById(list: { id: string; mastery: number; due: number }[]) {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export function nextConcept(s: TutorState): string {
  const due = dueReviews(s, 3);
  if (due.length) return due[0].id;
  // conceptos de un curso activo pendientes primero
  const activeCourse = Object.entries(s.course).find(([, c]) => !c.done);
  if (activeCourse) {
    const pending = activeCourse[1].concepts.filter(
      (id) => (s.concepts[id]?.mastery ?? 0) < 0.8,
    );
    if (pending.length) {
      pending.sort(
        (a, b) => (s.concepts[a]?.mastery ?? 0) - (s.concepts[b]?.mastery ?? 0),
      );
      return pending[0];
    }
  }
  const startedWeak = Object.entries(s.concepts)
    .filter(([, st]) => st.mastery < 0.7)
    .sort((a, b) => a[1].mastery - b[1].mastery);
  if (startedWeak.length) return startedWeak[0][0];
  const ordered = [...CONCEPTS].sort(
    (a, b) =>
      levelIndex(a.level) - levelIndex(b.level) ||
      CONCEPTS.indexOf(a) - CONCEPTS.indexOf(b),
  );
  for (const c of ordered) {
    if ((s.concepts[c.id]?.mastery ?? 0) >= 0.7) continue;
    const prereqsOk = c.prerequisites.every(
      (p) => (s.concepts[p]?.mastery ?? 0) >= 0.6,
    );
    if (prereqsOk) return c.id;
  }
  return ordered[ordered.length - 1].id;
}

export function abilities(
  s: TutorState,
): { id: string; label: string; level: string; pct: number }[] {
  return FUNCTIONS.map((f) => {
    const masters = f.concepts.map((id) => {
      const stat = s.concepts[id];
      if (!stat) return 0;
      const confidence = Math.min(1, stat.attempts / 5);
      const openErrorPenalty = stat.fails > stat.noHelp ? 0.12 : 0;
      return clamp(
        stat.mastery * (0.35 + confidence * 0.65) - openErrorPenalty,
      );
    });
    const avg = masters.length
      ? masters.reduce((a, b) => a + b, 0) / masters.length
      : 0;
    return {
      id: f.id,
      label: f.label,
      level: f.level,
      pct: Math.round(avg * 100),
    };
  }).sort((a, b) => b.pct - a.pct);
}

export function weakPoints(
  s: TutorState,
): { id: string; name: string; mastery: number }[] {
  const c = Object.entries(s.concepts)
    .filter(([, st]) => st.mastery < 0.55)
    .map(([id, st]) => ({
      id,
      name: conceptById(id)?.name || id,
      mastery: st.mastery,
    }))
    .sort((a, b) => a.mastery - b.mastery);
  const sk = (Object.entries(s.skills) as [SkillKey, number][])
    .filter(([, v]) => v < 0.45 && v > 0)
    .map(([k, v]) => ({
      id: `skill:${k}`,
      name: `Habilidad: ${skillLabel(k)}`,
      mastery: v,
    }))
    .sort((a, b) => a.mastery - b.mastery);
  return [...sk, ...c].slice(0, 6);
}

export function skillLabel(k: SkillKey): string {
  const map: Record<SkillKey, string> = {
    grammar: "Gramática",
    vocabulary: "Vocabulario",
    listening: "Comprensión oral",
    speaking: "Expresión oral",
    pronunciation: "Pronunciación",
    fluency: "Fluidez",
    writing: "Escritura",
    response_time: "Tiempo de respuesta",
  };
  return map[k];
}

export function skillList(): SkillKey[] {
  return [
    "grammar",
    "vocabulary",
    "listening",
    "speaking",
    "pronunciation",
    "fluency",
    "writing",
    "response_time",
  ];
}

export function dailyMission(s: TutorState): {
  review: string | null;
  practice: string;
  situation: string;
  interview: boolean;
} {
  const due = dueReviews(s, 1);
  return {
    review: due[0]?.id ?? null,
    practice: nextConcept(s),
    situation: s.profile?.situations?.[0] || "casual_talk",
    interview: s.profile?.goals?.includes("interviews") ?? false,
  };
}

/* ---- Plan: auto-completado según estadísticas reales (sin LLM) ---- */

export type PlanStats = {
  grammar: number;
  vocabulary: number;
  speaking: number;
  fluency: number;
  pronunciation: number;
  listening: number;
  attempts: number;
  errorsOpen: number;
};

export function planStats(s: TutorState): PlanStats {
  return {
    grammar: s.skills.grammar,
    vocabulary: s.skills.vocabulary,
    speaking: s.skills.speaking,
    fluency: s.skills.fluency,
    pronunciation: s.skills.pronunciation,
    listening: s.skills.listening,
    attempts: s.attempts.length,
    errorsOpen: s.errors.filter((e) => !e.successAfter).length,
  };
}

export function planItemStatus(
  item: string,
  st: PlanStats,
): { pct: number; done: boolean } {
  const t = item.toLowerCase();
  const g = (v: number) => Math.max(0, Math.min(1, v));
  let pct: number;
  let done: boolean;
  if (/(construcci|oracion|oraci|conector|estructura|gramat)/.test(t)) {
    pct = st.grammar;
    done = st.grammar >= 0.75;
  } else if (/(vocabulario|palabras|vocab)/.test(t)) {
    pct = st.vocabulary;
    done = st.vocabulary >= 0.75;
  } else if (/(fluidez|fluida|fluencia|ritmo)/.test(t)) {
    pct = g((st.fluency + st.speaking) / 2);
    done = st.fluency >= 0.7 && st.speaking >= 0.7;
  } else if (
    /(speaking|conversaci|hablar|entrevist|situaciones|diario)/.test(t)
  ) {
    pct = g((st.speaking * 2 + st.fluency) / 3);
    done = st.speaking >= 0.72;
  } else if (/(pronunciaci|pronunciacion|sonido)/.test(t)) {
    pct = st.pronunciation;
    done = st.pronunciation >= 0.75;
  } else if (/(escucha|auditiva|listening|repeti)/.test(t)) {
    pct = st.listening;
    done = st.listening >= 0.75;
  } else {
    const avg =
      (st.grammar +
        st.vocabulary +
        st.speaking +
        st.fluency +
        st.pronunciation +
        st.listening) /
      6;
    pct = g(avg);
    done = avg >= 0.75;
  }
  return { pct, done };
}

export function dueLabel(due: number): string {
  const diff = due - Date.now();
  if (diff <= 0) return "ahora";
  const h = Math.round(diff / 3600000);
  if (h < 24) return `en ${h} h`;
  const d = Math.round(h / 24);
  return `en ${d} día${d === 1 ? "" : "s"}`;
}

/* ---- Examen de certificación ---- */

export type ExamSection = {
  type: "listening" | "grammar";
  label: string;
  score: number;
  max: number;
};

export type ExamResult = {
  passed: boolean;
  wer: number;
  sections: ExamSection[];
  nextLevel: Level;
};

export function levelConceptsFor(s: TutorState): string[] {
  return CONCEPTS.filter((c) => c.level === s.level).map((c) => c.id);
}

export function examUnlocked(s: TutorState): boolean {
  const ids = levelConceptsFor(s);
  if (!ids.length) return false;
  return ids.every((id) => (s.concepts[id]?.mastery ?? 0) >= 0.8);
}

export function examProgress(s: TutorState): number {
  const ids = levelConceptsFor(s);
  if (!ids.length) return 0;
  const sum = ids.reduce((acc, id) => acc + (s.concepts[id]?.mastery ?? 0), 0);
  return sum / ids.length;
}

export function promoteLevel(s: TutorState): TutorState {
  const idx = LEVELS.indexOf(s.level);
  const next: Level = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
  return seedFromDiagnostic(s, next);
}

export function recordListening(s: TutorState, wer: number): TutorState {
  const delta =
    wer <= 0.1 ? 0.15 : wer <= 0.25 ? 0.09 : wer <= 0.4 ? 0.03 : -0.08;
  const skills = { ...s.skills, listening: clamp(s.skills.listening + delta) };
  const xpGained = wer <= 0.25 ? 8 : wer <= 0.4 ? 3 : 0;
  const attempt: Attempt = {
    concept: "listening",
    success: wer <= 0.25,
    helpUsed: 0,
    date: Date.now(),
    responseMs: 0,
    context: "dictado",
  };
  return {
    ...s,
    skills,
    attempts: [attempt, ...s.attempts],
    xp: s.xp + xpGained,
    energy: currentEnergy(s) + (wer <= 0.4 ? 1 : 0),
    energyUpdated: Date.now(),
  };
}

export function recordPronunciation(s: TutorState, wer: number): TutorState {
  const delta =
    wer <= 0.1 ? 0.15 : wer <= 0.25 ? 0.09 : wer <= 0.4 ? 0.03 : -0.08;
  const skills = {
    ...s.skills,
    pronunciation: clamp(s.skills.pronunciation + delta),
  };
  const xpGained = wer <= 0.25 ? 8 : wer <= 0.4 ? 3 : 0;
  const attempt: Attempt = {
    concept: "pronunciation",
    success: wer <= 0.25,
    helpUsed: 0,
    date: Date.now(),
    responseMs: 0,
    context: "pronunciar",
  };
  return {
    ...s,
    skills,
    attempts: [attempt, ...s.attempts],
    xp: s.xp + xpGained,
    energy: currentEnergy(s) + (wer <= 0.4 ? 1 : 0),
    energyUpdated: Date.now(),
  };
}

export function markErrorFixed(s: TutorState, errorId: string): TutorState {
  return {
    ...s,
    errors: s.errors.map((e) =>
      e.id === errorId ? { ...e, successAfter: true } : e,
    ),
  };
}

export function gradeExam(
  s: TutorState,
  listeningWer: number,
  grammarCorrect: number,
  grammarTotal: number,
): ExamResult {
  const idx = LEVELS.indexOf(s.level);
  const nextLevel: Level = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
  const listeningScore = Math.max(0, 1 - listeningWer);
  const grammarScore = grammarTotal ? grammarCorrect / grammarTotal : 0;
  const listeningPass = listeningWer <= 0.2;
  const grammarPass = grammarScore >= 0.6;
  const passed = listeningPass && grammarPass;
  return {
    passed,
    wer: listeningWer,
    sections: [
      {
        type: "listening",
        label: "Escucha (dictado)",
        score: listeningScore,
        max: 1,
      },
      { type: "grammar", label: "Gramática", score: grammarScore, max: 1 },
    ],
    nextLevel,
  };
}
