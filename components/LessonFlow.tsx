"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { classifyBuilderTap, conceptById, MCQS } from "@/lib/knowledge";
import { buildPractice, pickTransferContext, isContextId, type ContextId, type PracticePlan } from "@/lib/contextEngine";
import { contextById } from "@/lib/contexts";
import type { TutorState } from "@/lib/learner";

function contextLabelEs(id: ContextId): string {
  return contextById(id)?.label_es || id;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STEPS = ["Entender", "Patrón", "Construir", "Comprobar", "Producir", "Situación", "Transferir"] as const;
const QUICK_STEPS = ["Patrón", "Construir", "Comprobar", "Producir"] as const;
type Step = (typeof STEPS)[number];

type Props = {
  lessonId: string;
  conceptIds: string[];
  state: TutorState;
  quick?: boolean;
  onAttempt: (c: string, o: { success: boolean; helpUsed?: number; context?: string; wrong?: string; correct?: string; mode?: "voice" | "text"; responseMs?: number }) => void;
  onError: (c: string, o: { errorType: string; wrong: string; correct?: string; context?: string }) => void;
  onGoSpeak: (conceptId: string, context?: ContextId) => void;
  onComplete: () => void;
};

export default function LessonFlow({ lessonId, conceptIds, state, quick, onAttempt, onError, onGoSpeak, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>("Entender");
  const [built, setBuilt] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [hints, setHints] = useState(0);
  const [lastErr, setLastErr] = useState<{ type: string; detail: string } | null>(null);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqWrong, setMcqWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [transferIdx, setTransferIdx] = useState(0);
  const stepAtRef = useRef(Date.now());

  const conceptId = conceptIds[idx];
  const concept = conceptById(conceptId);

  useEffect(() => {
    stepAtRef.current = Date.now();
  }, [step, idx, conceptId]);
  const mcqs = useMemo(() => MCQS[conceptId] || [], [conceptId]);
  const target = concept?.examples[0]?.en || "";
  const targetWords = useMemo(() => target.split(/\s+/), [target]);

  const mainCtx: ContextId = useMemo(() => {
    const prof = state.profile?.interests?.[0];
    return prof && isContextId(prof) ? prof : "daily_life";
  }, [state.profile]);
  const situationPlan = useMemo(() => concept ? buildPractice(conceptId, mainCtx) : null, [conceptId, concept, mainCtx]);
  const mainContext = situationPlan?.context || "daily_life";

  const transfers = useMemo(() => {
    if (!concept) return [];
    const list: PracticePlan[] = [];
    const used = new Set<ContextId>([mainCtx]);
    for (let i = 0; i < 2; i++) {
      const t = pickTransferContext(conceptId, Array.from(used));
      if (!t) break;
      used.add(t.context);
      const plan = buildPractice(conceptId, t.context);
      if (plan) list.push(plan);
    }
    return shuffle(list);
  }, [conceptId, concept, mainCtx]);

  useEffect(() => {
    setStep(quick ? "Patrón" : "Entender");
    setBuilt([]);
    setPool(shuffle(targetWords));
    setWrongTaps(0);
    setHints(0);
    setLastErr(null);
    setMcqIdx(0);
    setMcqWrong(false);
    setDone(false);
    setTransferIdx(0);
  }, [conceptId, targetWords, quick]);

  if (!concept) {
    return <div className="panel">Concepto no encontrado.</div>;
  }

  const mcq = mcqs[mcqIdx % mcqs.length];
  const isLastConcept = idx === conceptIds.length - 1;

  const addWord = (w: string) => {
    const expected = targetWords[built.length];
    if (w !== expected) {
      const cls = classifyBuilderTap(targetWords, w);
      setLastErr(cls);
      setWrongTaps((v) => v + 1);
      onError(conceptId, { errorType: cls.type, wrong: w, correct: expected, context: mainContext });
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
    if (nb.length === targetWords.length) setStep(mcqs.length ? "Comprobar" : "Producir");
  };

  const pickMcq = (i: number) => {
    if (!mcq) return;
    if (i === mcq.answer) {
      setMcqWrong(false);
      setStep("Producir");
    } else {
      setMcqWrong(true);
      onError(conceptId, { errorType: mcq.errorType, wrong: mcq.options[i], correct: mcq.options[mcq.answer], context: mainContext });
    }
  };

  const rate = (success: boolean, help: number, context = mainContext) => {
    const responseMs = Math.max(300, Date.now() - stepAtRef.current);
    onAttempt(conceptId, { success, helpUsed: help + hints, context, wrong: success ? undefined : concept.examples[0].en, mode: "text", responseMs });
  };

  const advanceConcept = () => {
    if (isLastConcept) {
      setDone(true);
      onComplete();
    } else {
      setIdx((v) => v + 1);
    }
  };

  const nextTransfer = (success: boolean, help: number) => {
    rate(success, help, transfers[transferIdx].context);
    if (transferIdx < transfers.length - 1) {
      setTransferIdx((v) => v + 1);
    } else {
      advanceConcept();
    }
  };

  const mastery = state.concepts[conceptId]?.mastery ?? 0;

  return (
    <div className="panel lesson-flow">
      <div className="lessonflow-head">
        <div>
          <div className="lessonflow-title">
            Concepto {idx + 1} de {conceptIds.length} · {concept.name}{" "}
            <span className="lvl-badge">{concept.level}</span>
          </div>
          <div className="lessonflow-sub">Dominio: <b>{Math.round(mastery * 100)}%</b></div>
        </div>
        <div className="lessonflow-steps">
          {(quick ? QUICK_STEPS : STEPS).map((s) => {
            const order = quick ? QUICK_STEPS : STEPS;
            return (
              <span key={s} className={`lf-step ${order.indexOf(s as never) <= order.indexOf(step as never) ? "on" : ""} ${step === s ? "cur" : ""}`}>
                {s}
              </span>
            );
          })}
        </div>
      </div>

      {!done && step === "Entender" && (
        <div className="pblock">
          <div className="pblock-title">Entiende la idea</div>
          <ul className="p-rules">
            {concept.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
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
          <button className="start-btn" onClick={() => setStep("Patrón")}>Ver patrón →</button>
        </div>
      )}

      {!done && step === "Patrón" && (
        <div className="pblock">
          <div className="pblock-title">El patrón</div>
          <div className="pattern-box">{concept.pattern}</div>
          <div className="pattern-examples">
            {concept.examples.slice(0, 3).map((ex, i) => (
              <div key={i} className="pex">
                <div className="pex-en">{ex.en}</div>
                <div className="pex-pr">{ex.pr}</div>
                <div className="pex-es">{ex.es}</div>
              </div>
            ))}
          </div>
          <button className="start-btn" onClick={() => setStep("Construir")}>Armar la frase →</button>
        </div>
      )}

      {!done && step === "Construir" && (
        <div className="pblock">
          <div className="pblock-title">Arma la frase</div>
          <div className="build-area">
            <div className="build-target">“{target}”</div>
            <div className="build-answer">
              {built.length === 0 && <span className="build-placeholder">Toca las palabras en orden…</span>}
              {built.map((w, i) => (
                <span key={i} className="build-word on">{w}</span>
              ))}
            </div>
            <div className="build-pool">
              {pool.map((w, i) => (
                <button key={`${w}-${i}`} className="build-chip" onClick={() => addWord(w)}>{w}</button>
              ))}
            </div>
          </div>
          {lastErr && (
            <div className="build-err">
              <div className="build-err-line">❌ {lastErr.detail} — intentos: {wrongTaps}</div>
              {wrongTaps >= 2 && <div className="build-rule">🧠 Regla: {concept.common_errors[0]?.why || concept.rules[0]}</div>}
            </div>
          )}
          <div className="build-actions">
            <button className="chip-btn" onClick={revealHint}>💡 Mostrar siguiente</button>
            <button className="chip-btn" onClick={() => { setPool(shuffle(targetWords)); setBuilt([]); setWrongTaps(0); setLastErr(null); }}>🔄 Reiniciar</button>
          </div>
          {built.length === targetWords.length && <div className="build-done">✅ ¡Bien! Sigue.</div>}
        </div>
      )}

      {!done && step === "Comprobar" && mcq && (
        <div className="pblock">
          <div className="pblock-title">Comprueba que lo entiendes</div>
          <div className="mcq-q">{mcq.q}</div>
          <div className="mcq-options">
            {mcq.options.map((o, i) => (
              <button key={i} className={`mcq-opt ${mcqWrong ? "wrong" : ""}`} onClick={() => pickMcq(i)}>{o}</button>
            ))}
          </div>
          {mcqWrong && <div className="mcq-rule">🧠 {mcq.rule}</div>}
        </div>
      )}

      {!done && step === "Producir" && (
        <div className="pblock">
          <div className="pblock-title">Prodúcelo hablando</div>
          <div className="produce-q">{concept.produce.question_es}</div>
          <div className="produce-a">Una respuesta posible: <b>{concept.produce.answer_en}</b> ({concept.produce.answer_pr})</div>
          <div className="produce-actions">
            <button className="start-btn" onClick={() => onGoSpeak(conceptId)}>🗣 Practicar con el coach</button>
          </div>
          <div className="rate-row">
            <div className="rate-title">¿Cómo te fue?</div>
            <button className="chip-btn good" onClick={() => { rate(true, 0); if (quick) advanceConcept(); else setStep("Situación"); }}>Sin ayuda</button>
            <button className="chip-btn" onClick={() => { rate(true, 1); if (quick) advanceConcept(); else setStep("Situación"); }}>Con ayuda</button>
            <button className="chip-btn" onClick={() => { rate(false, 2, mainContext); if (quick) advanceConcept(); else setStep("Situación"); }}>No pude</button>
          </div>
        </div>
      )}

      {!done && step === "Situación" && (
        <div className="pblock">
          <div className="pblock-title">Úsalo en una situación real · {situationPlan?.contextLabelEs || mainContext}</div>
          <div className="situation-card">
            <div className="sit-en">🎬 {situationPlan?.scenario}</div>
            <div className="sit-es">{situationPlan?.questionEs}</div>
            <div className="sit-obj">🎯 Objetivo: {situationPlan?.objectiveLabel}</div>
          </div>
          <div className="produce-actions">
            <button className="start-btn" onClick={() => onGoSpeak(conceptId)}>🗣 Entrenar la situación</button>
          </div>
          <div className="rate-row">
            <div className="rate-title">¿Pudiste usarlo?</div>
            <button className="chip-btn good" onClick={() => { rate(true, 0); setStep("Transferir"); }}>Sí, natural</button>
            <button className="chip-btn" onClick={() => { rate(true, 1); setStep("Transferir"); }}>Con ayuda</button>
            <button className="chip-btn" onClick={() => { rate(false, 2); setStep("Transferir"); }}>Aún me cuesta</button>
          </div>
        </div>
      )}

      {!done && step === "Transferir" && transfers[transferIdx] && (
        <div className="pblock">
          <div className="pblock-title">
            Transferencia · {transfers[transferIdx].contextLabelEs}
            <span className="lf-transfer-count">{transferIdx + 1}/{transfers.length}</span>
          </div>
          <div className="situation-card">
            <div className="sit-en">🎬 {transfers[transferIdx].scenario}</div>
            <div className="sit-es">{transfers[transferIdx].questionEs}</div>
            <div className="sit-obj">🎯 Objetivo: {transfers[transferIdx].objectiveLabel}</div>
            {transfers[transferIdx].vocab.length > 0 && (
              <div className="sit-vocab" style={{ marginTop: 8, fontSize: "0.85rem", opacity: 0.85 }}>
                Vocabulario clave: {transfers[transferIdx].vocab.slice(0, 5).join(", ")}
              </div>
            )}
          </div>
          <div className="produce-actions">
            <button className="start-btn" onClick={() => onGoSpeak(conceptId, transfers[transferIdx].context)}>
              🗣 Practicarlo con el coach
            </button>
          </div>
          <div className="rate-row">
            <div className="rate-title">¿Lo dominas en este contexto?</div>
            <button className="chip-btn good" onClick={() => nextTransfer(true, 0)}>Sí, sin ayuda</button>
            <button className="chip-btn" onClick={() => nextTransfer(true, 1)}>Con ayuda</button>
            <button className="chip-btn" onClick={() => nextTransfer(false, 2)}>Aún cuesta</button>
          </div>
        </div>
      )}

      {done && (
        <div className="pblock done-block">
          <div className="done-title">🎉 {quick ? "Validación completada" : "Lección completada"}</div>
          <p>
            {quick
              ? `Validaste los ${conceptIds.length} conceptos de esta lección: quedó marcada como superada.`
              : `Has aprendido los ${conceptIds.length} conceptos de esta lección y los aplicaste en varios contextos. Se programaron repasos automáticos para consolidarlos.`}
          </p>
          <button className="start-btn" onClick={onComplete}>Volver al curso →</button>
        </div>
      )}
    </div>
  );
}