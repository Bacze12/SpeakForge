"use client";

import { useEffect, useMemo, useState } from "react";
import { classifyBuilderTap, conceptById, MCQS, SITUATIONS, type SkillKey } from "@/lib/knowledge";
import { isContextId, type ContextId } from "@/lib/contextEngine";
import type { TutorState } from "@/lib/learner";
import { recordAttempt } from "@/lib/learner";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Props = {
  conceptId: string;
  state: TutorState;
  context?: string;
  onAttempt: (c: string, o: { success: boolean; helpUsed?: number; context?: string; wrong?: string; correct?: string }) => void;
  onError: (c: string, o: { errorType: string; wrong: string; correct?: string; context?: string }) => void;
  onGoSpeak: (conceptId: string, context?: ContextId) => void;
  onNext: () => void;
};

const STEPS = ["Entender", "Ver patrón", "Construir", "Comprobar", "Producir", "Contexto"] as const;
type Step = (typeof STEPS)[number];

export default function PracticeView({ conceptId, state, context = "general", onAttempt, onError, onGoSpeak, onNext }: Props) {
  const concept = conceptById(conceptId);
  const [step, setStep] = useState<Step>("Entender");
  const [showRules, setShowRules] = useState(true);
  const [pool, setPool] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [hints, setHints] = useState(0);
  const [lastErr, setLastErr] = useState<{ type: string; detail: string } | null>(null);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqWrong, setMcqWrong] = useState(false);
  const [done, setDone] = useState(false);

  const mcqs = useMemo(() => MCQS[conceptId] || [], [conceptId]);
  const target = useMemo(() => concept?.examples[0]?.en || "", [concept]);
  const targetWords = useMemo(() => target.split(/\s+/), [target]);

  useEffect(() => {
    setStep("Entender");
    setPool(shuffle(targetWords));
    setBuilt([]);
    setWrongTaps(0);
    setHints(0);
    setLastErr(null);
    setMcqIdx(0);
    setMcqWrong(false);
    setDone(false);
    setShowRules(true);
  }, [conceptId, targetWords]);

  if (!concept) {
    return <div className="panel">Concepto no encontrado.</div>;
  }

  const situation = SITUATIONS.find((s) => s.id === (state.profile?.situations?.[0] || "casual_talk")) || SITUATIONS[7];
  const mcq = mcqs[mcqIdx % mcqs.length];

  const addWord = (w: string) => {
    const expected = targetWords[built.length];
    if (w !== expected) {
      const cls = classifyBuilderTap(targetWords, w);
      setLastErr(cls);
      setWrongTaps((v) => v + 1);
      onError(conceptId, { errorType: cls.type, wrong: w, correct: expected, context });
      return;
    }
    setLastErr(null);
    const nb = [...built, w];
    setBuilt(nb);
    setPool((p) => p.filter((x) => x !== w));
    if (nb.length === targetWords.length) {
      setStep(mcqs.length ? "Comprobar" : "Producir");
    }
  };

  const revealHint = () => {
    const w = targetWords[built.length];
    if (!w) return;
    setHints((v) => v + 1);
    const nb = [...built, w];
    setBuilt(nb);
    setPool((p) => p.filter((x) => x !== w));
    if (nb.length === targetWords.length) {
      setStep(mcqs.length ? "Comprobar" : "Producir");
    }
  };

  const pickMcq = (i: number) => {
    if (!mcq) return;
    if (i === mcq.answer) {
      setMcqWrong(false);
      setStep("Producir");
    } else {
      setMcqWrong(true);
      onError(conceptId, { errorType: mcq.errorType, wrong: mcq.options[i], correct: mcq.options[mcq.answer], context });
    }
  };

  const rate = (success: boolean, help: number, wrong?: string) => {
    onAttempt(conceptId, {
      success,
      helpUsed: help + hints,
      context,
      wrong,
      correct: success ? undefined : concept.examples[0].en,
    });
    setStep("Contexto");
  };

  const rateContext = (success: boolean, help: number) => {
    onAttempt(conceptId, { success, helpUsed: help, context });
    setDone(true);
  };

  const mastery = state.concepts[conceptId]?.mastery ?? 0;
  const skills = (concept.skills as SkillKey[]).join(", ");

  return (
    <div className="panel practice-panel">
      <div className="practice-head">
        <div>
          <div className="practice-title">
            {concept.name} <span className="lvl-badge">{concept.level}</span>
          </div>
          <div className="practice-meta">
            Dominio: <b>{Math.round(mastery * 100)}%</b> · Contexto: <b>{context}</b>
          </div>
        </div>
      </div>

      <div className="practice-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`pstep ${i <= STEPS.indexOf(step) ? "on" : ""} ${step === s ? "cur" : ""}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {!done && step === "Entender" && (
        <div className="pblock">
          <div className="pblock-title">1 · Entiende la idea</div>
          {showRules && (
            <ul className="p-rules">
              {concept.rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {concept.common_errors.length > 0 && (
            <div className="p-errors">
              <div className="p-errors-title">Errores típicos de este nivel:</div>
              {concept.common_errors.map((e, i) => (
                <div key={i} className="perr">
                  <span className="perr-wrong">✗ {e.wrong}</span>
                  <span className="perr-right">✓ {e.right}</span>
                  <span className="perr-why">{e.why}</span>
                </div>
              ))}
            </div>
          )}
          <button className="start-btn" onClick={() => setStep("Ver patrón")}>
            Ver patrón →
          </button>
        </div>
      )}

      {!done && step === "Ver patrón" && (
        <div className="pblock">
          <div className="pblock-title">2 · El patrón</div>
          <div className="pattern-box">{concept.pattern}</div>
          <div className="pattern-examples">
            {concept.examples.slice(0, 3).map((ex, i) => (
              <div key={i} className="pex">
                <div className="pex-en">
                  {ex.en.split(/\s+/).map((w, j) => (
                    <span key={j} className="pex-word">
                      {w}
                    </span>
                  ))}
                </div>
                <div className="pex-pr">{ex.pr}</div>
                <div className="pex-es">{ex.es}</div>
              </div>
            ))}
          </div>
          <button className="start-btn" onClick={() => setStep("Construir")}>
            Armar la frase →
          </button>
        </div>
      )}

      {!done && step === "Construir" && (
        <div className="pblock">
          <div className="pblock-title">3 · Arma la frase</div>
          <div className="build-area">
            <div className="build-target">“{target}”</div>
            <div className="build-answer">
              {built.length === 0 && <span className="build-placeholder">Toca las palabras en orden…</span>}
              {built.map((w, i) => (
                <span key={i} className="build-word on">
                  {w}
                </span>
              ))}
            </div>
            <div className="build-pool">
              {pool.map((w, i) => (
                <button key={`${w}-${i}`} className="build-chip" onClick={() => addWord(w)}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          {lastErr && (
            <div className="build-err">
              <div className="build-err-line">
                ❌ {lastErr.detail} — intentos: {wrongTaps}
              </div>
              {wrongTaps >= 2 && (
                <div className="build-rule">
                  🧠 Regla: {concept.common_errors[0]?.why || concept.rules[0]}
                </div>
              )}
            </div>
          )}
          <div className="build-actions">
            <button className="chip-btn" onClick={revealHint}>
              💡 Mostrar siguiente
            </button>
            <button
              className="chip-btn"
              onClick={() => {
                setPool(shuffle(targetWords));
                setBuilt([]);
                setWrongTaps(0);
                setLastErr(null);
              }}
            >
              🔄 Reiniciar
            </button>
          </div>
          {built.length === targetWords.length && <div className="build-done">✅ ¡Bien! Sigue.</div>}
        </div>
      )}

      {!done && step === "Comprobar" && mcq && (
        <div className="pblock">
          <div className="pblock-title">4 · Comprueba que lo entiendes</div>
          <div className="mcq-q">{mcq.q}</div>
          <div className="mcq-options">
            {mcq.options.map((o, i) => (
              <button key={i} className={`mcq-opt ${mcqWrong ? "wrong" : ""}`} onClick={() => pickMcq(i)}>
                {o}
              </button>
            ))}
          </div>
          {mcqWrong && <div className="mcq-rule">🧠 {mcq.rule}</div>}
        </div>
      )}

      {!done && step === "Producir" && (
        <div className="pblock">
          <div className="pblock-title">5 · Prodúcelo hablando</div>
          <div className="produce-q">{concept.produce.question_es}</div>
          <div className="produce-a">
            Una respuesta posible: <b>{concept.produce.answer_en}</b> ({concept.produce.answer_pr})
          </div>
          <div className="produce-actions">
            <button className="start-btn" onClick={() => onGoSpeak(conceptId)}>
              🗣 Practicar con el coach
            </button>
          </div>
          <div className="rate-row">
            <div className="rate-title">¿Cómo te fue?</div>
            <button className="chip-btn good" onClick={() => rate(true, 0)}>
              Sin ayuda
            </button>
            <button className="chip-btn" onClick={() => rate(true, 1)}>
              Con ayuda
            </button>
            <button className="chip-btn" onClick={() => rate(false, 2, concept.common_errors[0]?.wrong)}>
              No pude
            </button>
          </div>
        </div>
      )}

      {!done && step === "Contexto" && (
        <div className="pblock">
          <div className="pblock-title">6 · Úsalo en una situación real</div>
          <div className="situation-card">
            <div className="sit-en">🎬 {situation.situation_en}</div>
            <div className="sit-es">{situation.prompt_es}</div>
          </div>
          <div className="produce-actions">
            <button className="start-btn" onClick={() => onGoSpeak(conceptId, isContextId(context) ? context : undefined)}>
              🗣 Entrenar la situación
            </button>
          </div>
          <div className="rate-row">
            <div className="rate-title">¿Pudiste usarlo?</div>
            <button className="chip-btn good" onClick={() => rateContext(true, 0)}>
              Sí, natural
            </button>
            <button className="chip-btn" onClick={() => rateContext(true, 1)}>
              Con ayuda
            </button>
            <button className="chip-btn" onClick={() => rateContext(false, 2)}>
              Aún me cuesta
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="pblock done-block">
          <div className="done-title">Listo por hoy con este concepto</div>
          <p>
            Quedó registrado con contexto “{context}” y se programó un repaso. En unos días lo verás de nuevo, y luego
            en un contexto nuevo para comprobar que lo dominas sin ayuda.
          </p>
          <button className="start-btn" onClick={onNext}>
            Ir al siguiente concepto →
          </button>
        </div>
      )}
    </div>
  );
}