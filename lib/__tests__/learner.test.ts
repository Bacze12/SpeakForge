import { describe, it, expect } from "vitest";
import {
  emptyState,
  recordAttempt,
  recordError,
  dueReviews,
  nextConcept,
  type ConceptStat,
} from "../learner";

function mk(mastery: number, lastPractice = 0): ConceptStat {
  return {
    mastery,
    attempts: 1,
    noHelp: mastery >= 0.5 ? 1 : 0,
    withHelp: 0,
    fails: mastery < 0.5 ? 1 : 0,
    responseMs: 6000,
    lastPractice,
    lastContext: "general",
    contexts: { general: 1 },
    errors: {},
  };
}

describe("Motor adaptativo — casos de aprendizaje", () => {
  it("Caso 1: falla → recibe ayuda → reintenta → el dominio mejora", () => {
    let s = emptyState();
    s = recordAttempt(s, "present_simple", {
      success: false,
      helpUsed: 0,
      context: "technology",
      wrong: "He work in IT",
      correct: "He works in IT",
      errorType: "third_person_s",
    });
    const afterFail = s.concepts["present_simple"].mastery;

    s = recordAttempt(s, "present_simple", { success: true, helpUsed: 2, context: "technology" });
    const afterAssisted = s.concepts["present_simple"].mastery;

    s = recordAttempt(s, "present_simple", { success: true, helpUsed: 0, context: "technology" });
    const afterIndependent = s.concepts["present_simple"].mastery;

    expect(afterFail).toBeLessThan(afterAssisted);
    expect(afterAssisted).toBeLessThan(afterIndependent);
    expect(s.concepts["present_simple"].errors.third_person_s).toBe(1);
    expect(s.concepts["present_simple"].attempts).toBe(3);
    expect(s.errors.length).toBeGreaterThan(0);
  });

  it("Caso 2: un concepto dominado no aparece para repasar todos los días", () => {
    let s = emptyState();
    s = recordAttempt(s, "present_simple", { success: true, helpUsed: 0 });
    expect(dueReviews(s).some((r) => r.id === "present_simple")).toBe(false);

    // Al día siguiente sí corresponde repasarlo
    s.reviews["present_simple"] = { ...s.reviews["present_simple"], due: Date.now() - 1000 };
    expect(dueReviews(s).some((r) => r.id === "present_simple")).toBe(true);
  });

  it("Caso 3: el punto débil se prioriza sobre el concepto dominado", () => {
    let s = emptyState();
    s.concepts["present_simple"] = mk(0.92);
    s.concepts["wh_questions"] = mk(0.2);
    expect(nextConcept(s)).toBe("wh_questions");
    expect(dueReviews(s).some((r) => r.id === "wh_questions")).toBe(true);
  });

  it("Caso 4: aprender en un contexto y luego transferirlo a otro queda registrado", () => {
    let s = emptyState();
    s = recordAttempt(s, "present_simple", { success: true, helpUsed: 0, context: "technology" });
    s = recordAttempt(s, "present_simple", { success: true, helpUsed: 0, context: "cooking" });
    const st = s.concepts["present_simple"];
    expect(st.lastContext).toBe("cooking");
    expect(st.contexts.technology).toBe(1);
    expect(st.contexts.cooking).toBe(1);
  });

  it("Caso 5: más ayudas = menos subida de dominio que sin ayuda", () => {
    const noHelp = recordAttempt(emptyState(), "present_simple", { success: true, helpUsed: 0 });
    const withHelp = recordAttempt(emptyState(), "present_simple", { success: true, helpUsed: 2 });
    expect(noHelp.concepts["present_simple"].mastery).toBeGreaterThan(
      withHelp.concepts["present_simple"].mastery
    );
  });

  it("Caso 6: recuperar sin ayuda después de tiempo recibe un bonus de retención", () => {
    const eightDays = Date.now() - 8 * 86400000;
    let s = emptyState();
    s.concepts["present_simple"] = mk(0.6, eightDays);
    s.reviews["present_simple"] = { due: Date.now() - 86400000, interval: 5, ease: 2.5, last: eightDays };
    s = recordAttempt(s, "present_simple", { success: true, helpUsed: 0, context: "cooking" });
    // 0.6 + 0.18 (independiente) + 0.15 (bonus 7 días) = 0.93
    expect(s.concepts["present_simple"].mastery).toBeGreaterThanOrEqual(0.92);
    expect(s.concepts["present_simple"].lastContext).toBe("cooking");
  });

  it("Los errores deterministas se registran por tipo (sin LLM)", () => {
    let s = emptyState();
    s = recordError(s, "present_simple", {
      errorType: "word_order",
      wrong: "work I in IT",
      correct: "I work in IT",
      context: "technology",
    });
    expect(s.concepts["present_simple"].errors.word_order).toBe(1);
    expect(s.errors[0].type).toBe("word_order");
    expect(s.errors[0].context).toBe("technology");
  });
});
