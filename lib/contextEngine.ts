// Context Engine: combina Concepto + Contexto + Objetivo de forma determinista
// para producir un plan de práctica. La oración conversacional real la genera
// el coach (IA); aquí SOLO se decide qué practicar y cómo preguntarlo.
import { CONTEXTS, contextById, isContextId, CONTEXT_IDS, type ContextId, type ObjectiveId } from "./contexts";
import { conceptById, type GrammarConcept } from "./knowledge";

export { isContextId, CONTEXT_IDS };
export type { ContextId, ObjectiveId }; // re-export para un punto de import único

export type PracticePlan = {
  concept: GrammarConcept;
  conceptId: string;
  context: ContextId;
  contextLabel: string;
  contextLabelEs: string;
  objective: ObjectiveId;
  objectiveLabel: string;
  // Pregunta en español que hace producir el concepto en ese contexto/objetivo.
  questionEs: string;
  // Instrucción en inglés para el coach: qué producir y en qué escenario.
  coachPrompt: string;
  vocab: string[];
  scenario: string;
};

// Objetivos que cada concepto puede producir (de sus `functions`).
export function objectivesForConcept(concept: GrammarConcept): ObjectiveId[] {
  const map: Record<string, ObjectiveId> = {
    introduce_myself: "introduce_myself",
    ask_basic_questions: "ask_basic_questions",
    talk_about_routines: "talk_about_routines",
    describe_people_objects: "describe_people_objects",
    express_needs_help: "express_needs_help",
    describe_location: "describe_location",
    talk_about_now: "talk_about_now",
    talk_about_past: "talk_about_past",
    handle_work_situations: "handle_work_situations",
    interview_basics: "interview_basics",
  };
  return concept.functions.map((f) => map[f]).filter((o): o is ObjectiveId => !!o);
}

// Contextos en los que se puede practicar un concepto (los que tienen pregunta
// para alguno de sus objetivos).
export function contextsForConcept(concept: GrammarConcept): ContextId[] {
  const objs = new Set(objectivesForConcept(concept));
  return CONTEXTS.filter((c) =>
    Object.keys(c.questions).some((o) => objs.has(o as ObjectiveId))
  ).map((c) => c.id);
}

export const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  introduce_myself: "Presentarte",
  ask_basic_questions: "Hacer preguntas",
  talk_about_routines: "Hablar de rutinas",
  describe_people_objects: "Describir personas y objetos",
  express_needs_help: "Pedir ayuda",
  describe_location: "Describir lugares",
  talk_about_now: "Hablar del presente",
  talk_about_past: "Hablar del pasado",
  handle_work_situations: "Manejar situaciones de trabajo",
  interview_basics: "Responder en una entrevista",
};

// Construye el plan determinista para practicar un concepto en un contexto
// dado y un objetivo dado. Si el contexto no tiene pregunta para ese objetivo,
// cae a un objetivo compatible del concepto.
export function buildPractice(
  conceptId: string,
  contextId: ContextId,
  objectiveId?: ObjectiveId
): PracticePlan | null {
  const concept = conceptById(conceptId);
  if (!concept) return null;
  const ctx = contextById(contextId);
  if (!ctx) return null;

  const conceptObjs = objectivesForConcept(concept);
  let objective: ObjectiveId | null = null;
  let questionEs = "";
  if (objectiveId && ctx.questions[objectiveId]) {
    objective = objectiveId;
    questionEs = ctx.questions[objectiveId]!;
  } else {
    for (const o of conceptObjs) {
      if (ctx.questions[o]) {
        objective = o;
        questionEs = ctx.questions[o]!;
        break;
      }
    }
  }
  if (!objective) objective = conceptObjs[0] || "talk_about_routines";
  if (!questionEs) questionEs = `Haz una pregunta o di algo usando "${concept.pattern}".`;

  const coachPrompt =
    `PRÁCTICA DE CONCEPTO EN CONTEXTO.\n` +
    `- Concepto: ${concept.name} (patrón: ${concept.pattern}).\n` +
    `- Contexto: ${ctx.label} — ${ctx.scenario}.\n` +
    `- Objetivo: ${OBJECTIVE_LABELS[objective]}.\n` +
    `- Vocabulario sugerido del contexto: ${ctx.vocab.join(", ")}.\n` +
    `- Tarea: haz que el usuario produzca el concepto en este contexto. ` +
    `Primero explícale brevemente (español) qué debe producir usando la pregunta: "${questionEs}". ` +
    `Luego practica en inglés con oraciones naturales de este contexto, usando el vocabulario sugerido. ` +
    `Corrige SOLO errores de este concepto (${concept.level}). ` +
    `Tras 3-4 intercambios exitosos sin ayuda, escribe EXACTAMENTE "FIN DE PRÁCTICA DE CONCEPTO".`;

  return {
    concept,
    conceptId,
    context: contextId,
    contextLabel: ctx.label,
    contextLabelEs: ctx.label_es,
    objective,
    objectiveLabel: OBJECTIVE_LABELS[objective],
    questionEs,
    coachPrompt,
    vocab: ctx.vocab,
    scenario: ctx.scenario,
  };
}

// Elige un contexto de transferencia (distinto del principal) para verificar
// que el concepto se domina en un dominio nuevo.
export function pickTransferContext(
  conceptId: string,
  excludeContexts: ContextId[] = []
): { context: ContextId; questionEs: string } | null {
  const concept = conceptById(conceptId);
  if (!concept) return null;
  const available = contextsForConcept(concept).filter((c) => !excludeContexts.includes(c));
  if (!available.length) return null;
  const ctxId = available[Math.floor(Math.random() * available.length)];
  const ctx = contextById(ctxId)!;
  const objs = objectivesForConcept(concept);
  let questionEs = "";
  for (const o of objs) {
    if (ctx.questions[o]) {
      questionEs = ctx.questions[o]!;
      break;
    }
  }
  return { context: ctxId, questionEs };
}