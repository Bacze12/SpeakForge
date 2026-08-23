import { describe, it, expect } from "vitest";
import {
  objectivesForConcept,
  contextsForConcept,
  buildPractice,
  pickTransferContext,
  isContextId,
  CONTEXT_IDS,
  OBJECTIVE_LABELS,
} from "../contextEngine";
import { CONCEPTS, conceptById } from "../knowledge";
import { CONTEXTS, type ContextId, type ObjectiveId } from "../contexts";

describe("Context Engine — objectivesForConcept & contextsForConcept", () => {
  it("extrae los objetivos válidos de un concepto según sus communicative functions", () => {
    const concept = conceptById("present_simple");
    expect(concept).toBeDefined();
    if (!concept) return;

    const objs = objectivesForConcept(concept);
    expect(objs.length).toBeGreaterThan(0);
    expect(objs).toContain("talk_about_routines");
  });

  it("encuentra los contextos compatibles que tengan preguntas para los objetivos del concepto", () => {
    const concept = conceptById("present_simple");
    expect(concept).toBeDefined();
    if (!concept) return;

    const ctxs = contextsForConcept(concept);
    expect(ctxs.length).toBeGreaterThan(0);
    expect(ctxs).toContain("daily_life");
    expect(ctxs).toContain("work");
  });

  it("todos los conceptos de la base de conocimiento tienen al menos un contexto compatible", () => {
    for (const c of CONCEPTS) {
      const ctxs = contextsForConcept(c);
      expect(
        ctxs.length,
        `Concepto ${c.id} (${c.name}) debe tener al menos 1 contexto compatible`
      ).toBeGreaterThan(0);
    }
  });

  it("todos los objetivos tienen una etiqueta legible en español", () => {
    const sampleObjectives: ObjectiveId[] = [
      "introduce_myself",
      "ask_basic_questions",
      "talk_about_routines",
      "describe_people_objects",
      "express_needs_help",
      "describe_location",
      "talk_about_now",
      "talk_about_past",
      "handle_work_situations",
      "interview_basics",
    ];

    for (const obj of sampleObjectives) {
      expect(OBJECTIVE_LABELS[obj]).toBeDefined();
      expect(OBJECTIVE_LABELS[obj].length).toBeGreaterThan(0);
    }
  });
});

describe("Context Engine — buildPractice", () => {
  it("construye un plan determinista válido para un concepto y contexto dados", () => {
    const plan = buildPractice("present_simple", "technology");
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.conceptId).toBe("present_simple");
    expect(plan.context).toBe("technology");
    expect(plan.contextLabel).toBe("Technology");
    expect(plan.contextLabelEs).toBe("Tecnología");
    expect(plan.vocab).toContain("laptop");
    expect(plan.scenario).toContain("apps");
    expect(plan.coachPrompt).toContain("PRÁCTICA DE CONCEPTO EN CONTEXTO");
    expect(plan.coachPrompt).toContain("FIN DE PRÁCTICA DE CONCEPTO");
    expect(plan.coachPrompt).toContain("Technology");
  });

  it("respeta el objetivo solicitado si el contexto tiene pregunta para él", () => {
    const plan = buildPractice("past_simple", "travel", "talk_about_past");
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.objective).toBe("talk_about_past");
    expect(plan.questionEs).toBe("Cuéntame de un viaje que hiciste.");
    expect(plan.coachPrompt).toContain(plan.questionEs);
  });

  it("hace fallback a otro objetivo compatible si el solicitado no existe en ese contexto", () => {
    // 'travel' no tiene 'interview_basics', pero 'past_simple' tiene 'talk_about_past'
    const plan = buildPractice("past_simple", "travel", "interview_basics");
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(plan.context).toBe("travel");
    expect(plan.questionEs.length).toBeGreaterThan(0);
    expect(plan.coachPrompt).toContain(plan.questionEs);
  });

  it("retorna null si el concepto no existe", () => {
    const plan = buildPractice("concepto_inventado_xyz", "daily_life");
    expect(plan).toBeNull();
  });

  it("retorna null si el contexto no existe", () => {
    const plan = buildPractice("present_simple", "contexto_invalido" as ContextId);
    expect(plan).toBeNull();
  });
});

describe("Context Engine — pickTransferContext", () => {
  it("selecciona un contexto de transferencia excluyendo los ya usados", () => {
    const mainCtx: ContextId = "daily_life";
    const transfer = pickTransferContext("present_simple", [mainCtx]);
    expect(transfer).not.toBeNull();
    if (!transfer) return;

    expect(transfer.context).not.toBe(mainCtx);
    expect(transfer.questionEs.length).toBeGreaterThan(0);

    const fullPlan = buildPractice("present_simple", transfer.context);
    expect(fullPlan).not.toBeNull();
  });

  it("permite encadenar múltiples contextos de transferencia distintos", () => {
    const used: ContextId[] = ["daily_life"];
    const t1 = pickTransferContext("present_simple", used);
    expect(t1).not.toBeNull();
    if (!t1) return;

    used.push(t1.context);
    const t2 = pickTransferContext("present_simple", used);
    if (t2) {
      expect(t2.context).not.toBe(used[0]);
      expect(t2.context).not.toBe(used[1]);
    }
  });

  it("retorna null si todos los contextos compatibles están excluidos", () => {
    const concept = conceptById("present_simple");
    if (!concept) return;

    const allCtxs = contextsForConcept(concept);
    const result = pickTransferContext("present_simple", allCtxs);
    expect(result).toBeNull();
  });

  it("retorna null si el concepto no existe", () => {
    const result = pickTransferContext("non_existent_concept");
    expect(result).toBeNull();
  });
});

describe("Context Engine — isContextId & CONTEXT_IDS", () => {
  it("valida contextos reconocidos correctamente", () => {
    expect(isContextId("daily_life")).toBe(true);
    expect(isContextId("technology")).toBe(true);
    expect(isContextId("medical")).toBe(true);
    expect(isContextId("gaming")).toBe(true);
  });

  it("rechaza strings arbitrarios o valores no-string", () => {
    expect(isContextId("un_contexto_falso")).toBe(false);
    expect(isContextId("")).toBe(false);
    expect(isContextId(null)).toBe(false);
    expect(isContextId(undefined)).toBe(false);
    expect(isContextId(123)).toBe(false);
  });

  it("CONTEXT_IDS coincide con los IDs definidos en CONTEXTS", () => {
    expect(CONTEXT_IDS.length).toBe(CONTEXTS.length);
    for (const ctx of CONTEXTS) {
      expect(CONTEXT_IDS).toContain(ctx.id);
      expect(isContextId(ctx.id)).toBe(true);
    }
  });
});
