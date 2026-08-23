import { describe, it, expect } from "vitest";
import { compareDictation, dictationsForLevel, listensAllowed } from "../dictation";
import {
  emptyState,
  gradeExam,
  recordListening,
  recordPronunciation,
  examUnlocked,
  promoteLevel,
  recordAttempt,
  xpLevel,
  xpLevelProgress,
  dailyGoals,
  toggleGoal,
  markErrorFixed,
  wordErrors,
  currentEnergy,
  addEnergy,
  spendEnergy,
  unlockedBonuses,
} from "../learner";
import { MINIMAL_PAIRS, PRON_SENTENCES, pronSentencesForLevel } from "../pronunciation";

describe("Dictado — evaluación por palabras (WER)", () => {
  const ref = "My name is Ana. I live in a small house.";

  it("texto idéntico → 0% error, todo aciertos", () => {
    const r = compareDictation("my name is ana i live in a small house", ref);
    expect(r.wer).toBe(0);
    expect(r.correct).toBe(10);
    expect(r.wrong).toBe(0);
    expect(r.missing).toBe(0);
    expect(r.extra).toBe(0);
  });

  it("una palabra mal escrita → se marca como error", () => {
    const r = compareDictation("my name is ana I live in a small houses", ref);
    expect(r.wrong).toBeGreaterThan(0);
    expect(r.wer).toBeGreaterThan(0);
    expect(r.wer).toBeLessThan(0.2);
  });

  it("palabras omitidas cuentan como faltantes", () => {
    const r = compareDictation("my name is ana live in small house", ref);
    expect(r.missing).toBeGreaterThan(0);
    expect(r.extra).toBe(0);
  });

  it("palabras de más cuentan como sobrantes", () => {
    const r = compareDictation("my name is ana yes I live in a small house", ref);
    expect(r.extra).toBeGreaterThan(0);
  });

  it("texto vacío → 100% error", () => {
    const r = compareDictation("", ref);
    expect(r.wer).toBe(1);
  });
});

describe("Dictado — historias por nivel", () => {
  it("cada nivel A1-A2 tiene al menos una historia", () => {
    expect(dictationsForLevel("A1").length).toBeGreaterThan(0);
    expect(dictationsForLevel("A2").length).toBeGreaterThan(0);
  });

  it("A1 permite más escuchas que C1", () => {
    expect(listensAllowed("A1")).toBeGreaterThan(listensAllowed("C1"));
  });
});

describe("Examen de certificación", () => {
  it("recordListening sube la habilidad de escucha con buen WER", () => {
    let s = emptyState();
    s = recordListening(s, 0.05);
    expect(s.skills.listening).toBeGreaterThan(0);
    expect(s.attempts[0].context).toBe("dictado");
  });

  it("gradeExam aprueba con buen listening y gramática", () => {
    const s = emptyState();
    const r = gradeExam(s, 0.1, 5, 6);
    expect(r.passed).toBe(true);
    expect(r.nextLevel).toBe("A2");
  });

  it("gradeExam suspende con listening malo", () => {
    const s = emptyState();
    const r = gradeExam(s, 0.6, 5, 6);
    expect(r.passed).toBe(false);
  });

  it("examen bloqueado sin dominar conceptos del nivel", () => {
    const s = emptyState();
    expect(examUnlocked(s)).toBe(false);
  });

  it("promoteLevel sube A1→A2", () => {
    const s = { ...emptyState(), level: "A1" as const };
    const n = promoteLevel(s);
    expect(n.level).toBe("A2");
  });
});

describe("Pronunciación", () => {
  it("existen pares mínimos para sonidos difíciles en español", () => {
    const ids = MINIMAL_PAIRS.map((p) => p.id);
    expect(ids.length).toBeGreaterThan(10);
    expect(ids).toContain("mp1"); // ship/sheep
    expect(ids).toContain("mp9"); // think/sink
  });

  it("cada nivel A1-B1 tiene frases de práctica", () => {
    expect(pronSentencesForLevel("A1").length).toBeGreaterThan(0);
    expect(pronSentencesForLevel("A2").length).toBeGreaterThan(0);
    expect(pronSentencesForLevel("B1").length).toBeGreaterThan(0);
    expect(PRON_SENTENCES.length).toBeGreaterThan(10);
  });

  it("recordPronunciation sube la habilidad con buen WER", () => {
    let s = emptyState();
    s = recordPronunciation(s, 0.08);
    expect(s.skills.pronunciation).toBeGreaterThan(0);
    expect(s.attempts[0].context).toBe("pronunciar");
  });

  it("recordPronunciation castiga WER malo", () => {
    const before = 0.5;
    const s = recordPronunciation({ ...emptyState(), skills: { ...emptyState().skills, pronunciation: before } }, 0.8);
    expect(s.skills.pronunciation).toBeLessThan(before);
  });
});

describe("XP y metas diarias", () => {
  it("recordAttempt exitoso sin ayuda otorga XP", () => {
    let s = emptyState();
    s = recordAttempt(s, "to_be", { success: true, helpUsed: 0 });
    expect(s.xp).toBeGreaterThan(0);
  });

  it("niveles de XP suben con el total", () => {
    expect(xpLevel(0)).toBe(1);
    expect(xpLevel(150)).toBeGreaterThan(1);
    const p = xpLevelProgress(150);
    expect(p.pct).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeLessThanOrEqual(100);
  });

  it("dailyGoals genera una meta de práctica", () => {
    const s = emptyState();
    const goals = dailyGoals(s);
    expect(goals.length).toBeGreaterThanOrEqual(1);
    expect(goals.some((g) => g.tab === "practice")).toBe(true);
  });

  it("toggleGoal marca/desmarca según la fecha de hoy", () => {
    let s = emptyState();
    expect(toggleGoal(s, "situation").goalsDone).toBeDefined();
  });

  it("markErrorFixed marca successAfter del error", () => {
    const s = {
      ...emptyState(),
      errors: [
        {
          id: "e1",
          concept: "to_be",
          type: "grammar",
          wrong: "I is",
          correct: "I am",
          why: "usar am",
          context: "general",
          helpUsed: 0,
          attempts: 1,
          date: 1,
          successAfter: false,
        },
      ],
    };
    const n = markErrorFixed(s, "e1");
    expect(n.errors[0].successAfter).toBe(true);
  });

  it("wordErrors agrupa y ordena por frecuencia", () => {
    const s = {
      ...emptyState(),
      errors: [
        { id: "1", concept: "a", type: "g", wrong: "Is", correct: "Are", why: "", context: "", helpUsed: 0, attempts: 1, date: 1, successAfter: false },
        { id: "2", concept: "a", type: "g", wrong: "is", correct: "are", why: "", context: "", helpUsed: 0, attempts: 1, date: 2, successAfter: false },
      ],
    };
    const w = wordErrors(s);
    expect(w.length).toBe(1);
    expect(w[0].count).toBe(2);
  });

  it("energía: gastar y ganar respeta el máximo", () => {
    let s = emptyState();
    s = spendEnergy(s, 1);
    expect(currentEnergy(s)).toBe(4);
    s = addEnergy(s, 3);
    expect(currentEnergy(s)).toBe(5);
  });

  it("bonificaciones se desbloquean por XP", () => {
    expect(unlockedBonuses(0)).toHaveLength(0);
    expect(unlockedBonuses(45)).toHaveLength(1);
    expect(unlockedBonuses(999).length).toBeGreaterThan(2);
  });
});
