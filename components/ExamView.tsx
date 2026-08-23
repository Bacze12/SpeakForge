"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compareDictation, dictationsForLevel, listensAllowed, werLabel } from "@/lib/dictation";
import { CONCEPTS, MCQS } from "@/lib/knowledge";
import { examUnlocked, examProgress, gradeExam, type ExamResult } from "@/lib/learner";
import type { Level, TutorState } from "@/lib/learner";
import { TtsPlayer, type TtsEngine } from "@/lib/tts";

type Props = {
  state: TutorState;
  onPass: (r: ExamResult) => void;
  onClose: () => void;
};

const EXAM_MINUTES = 15;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export default function ExamView({ state, onPass, onClose }: Props) {
  const [phase, setPhase] = useState<"intro" | "running" | "result">("intro");
  const [listensLeft, setListensLeft] = useState(listensAllowed(state.level));
  const [paused, setPaused] = useState(false);
  const [ttsMode, setTtsMode] = useState<TtsEngine>("browser");
  const [progTime, setProgTime] = useState(0);
  const [progDur, setProgDur] = useState(0);
  const [listeningText, setListeningText] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_MINUTES * 60);
  const [result, setResult] = useState<ExamResult | null>(null);

  const tts = useMemo(() => new TtsPlayer(), []);

  const dictation = useMemo(
    () => {
      const pool = dictationsForLevel(state.level);
      return pool[Math.floor(Math.random() * pool.length)] || null;
    },
    [state.level]
  );

  const grammarQs = useMemo(() => {
    const qs = CONCEPTS.filter((c) => c.level === state.level)
      .flatMap((c) => MCQS[c.id] || [])
      .filter(Boolean);
    return shuffle(qs).slice(0, 6);
  }, [state.level]);

  const finish = () => {
    const wer = dictation ? compareDictation(listeningText, dictation.text).wer : 1;
    const answered = grammarQs.filter((_, i) => answers[i] !== undefined);
    const correct = answered.filter((_, i) => answers[i] === grammarQs[i].answer).length;
    const r = gradeExam(state, wer, correct, grammarQs.length);
    setResult(r);
    setPhase("result");
    tts.cancel();
  };

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finishRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const speak = async () => {
    if (!dictation || listensLeft <= 0) return;
    const mode = await tts.speak(dictation.text, {
      rate: state.level === "A1" ? 0.85 : state.level === "A2" ? 0.95 : 1,
    });
    setTtsMode(mode);
    setListensLeft((n) => n - 1);
    setPaused(false);
  };

  const pauseResume = () => {
    if (paused) {
      tts.resume();
      setPaused(false);
    } else {
      tts.pause();
      setPaused(true);
    }
  };

  useEffect(() => {
    const iv = setInterval(() => {
      setProgTime(tts.currentTime);
      setProgDur(tts.duration);
    }, 200);
    return () => clearInterval(iv);
  }, [tts]);

  const seekBy = (delta: number) => {
    tts.seek(tts.currentTime + delta);
    setProgTime(tts.currentTime);
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (phase === "intro") {
    const unlocked = examUnlocked(state);
    const progress = examProgress(state);
    return (
      <div className="panel exam-wrap">
        <div className="panel-head">
          <span className="suggest-title">🏆 Examen de certificación — {state.level}</span>
          <span className="suggest-sub">
            Demuestra que dominas tu nivel actual para subir al siguiente. Si apruebas, tu nivel sube y se desbloquean conceptos nuevos.
          </span>
        </div>
        <div className="exam-rules">
          <div>⏱ Duración total: {EXAM_MINUTES} minutos (auto-entrega al agotarse).</div>
          <div>👂 Sección 1 — Escucha: escuchas una historia {listensAllowed(state.level)} vez/veces y escribes todo lo que oyes. Sin pausar en exámenes superiores.</div>
          <div>📝 Sección 2 — Gramática: {grammarQs.length} preguntas de opción múltiple.</div>
          <div>✅ Apruebas con WER ≤ 20% y ≥ 60% en gramática.</div>
        </div>
        <div className="exam-unlock">
          {unlocked ? (
            <span className="ok">✓ Desbloqueado: dominas los conceptos de {state.level}. ¡A por el examen!</span>
          ) : (
            <span className="bad">🔒 Bloqueado: dominas {Math.round(progress * 100)}% de los conceptos de {state.level} (necesitas 100%). Sigue avanzando en Cursos.</span>
          )}
        </div>
        <div className="dict-actions">
          <button className="chip-btn" onClick={onClose}>Volver</button>
          <button className="start-btn" disabled={!unlocked} onClick={() => setPhase("running")}>
            Comenzar examen →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="panel exam-wrap">
        <div className={`exam-result-banner ${result.passed ? "pass" : "fail"}`}>
          {result.passed ? "🎉 ¡Examen aprobado! Subes de nivel." : "❌ No aprobado todavía."}
        </div>
        <div className="exam-rules">
          <div>Escucha (dictado): WER {Math.round(result.wer * 100)}% · {werLabel(result.wer)}</div>
          {result.sections.map((s) => (
            <div key={s.type}>
              {s.label}: {Math.round(s.score * 100)}%
            </div>
          ))}
        </div>
        {result.passed ? (
          <p className="exam-next">
            Tu nuevo nivel es <strong>{result.nextLevel}</strong>. Los conceptos de tu nivel anterior quedan asentados y se abre el plan de {result.nextLevel}.
          </p>
        ) : (
          <p className="exam-next">Repasa las palabras que fallaste y vuelve a intentarlo cuando estés listo.</p>
        )}
        <div className="dict-actions">
          <button
            className="start-btn"
            onClick={() => {
              onPass(result);
              onClose();
            }}
          >
            {result.passed ? "Subir de nivel →" : "Cerrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel exam-wrap">
      <div className="exam-timer">
        ⏱ Tiempo restante: {mm}:{ss} · Escuchas restantes: {listensLeft}
      </div>

      <div className="exam-section">
        <div className="suggest-title">1 · Escucha: «{dictation?.title}»</div>
        <div className="dict-actions">
          <button className="chip-btn primary" onClick={speak} disabled={listensLeft <= 0}>
            ▶ Escuchar ({listensLeft} restantes)
          </button>
          <button className="chip-btn" onClick={pauseResume} disabled={listensLeft >= listensAllowed(state.level) || progDur === 0}>
            {paused ? "▶ Reanudar" : "⏸ Pausa"}
          </button>
          {progDur > 0 && (
            <span className="dict-seek">
              <button className="chip-btn" onClick={() => seekBy(-5)} title="Retroceder 5s">⏪5s</button>
              <span className="dict-prog">{fmtTime(progTime)} / {fmtTime(progDur)}</span>
              <button className="chip-btn" onClick={() => seekBy(5)} title="Avanzar 5s">5s⏩</button>
            </span>
          )}
          <span className="dict-plays">
            Escribe todo lo que escuchas · voz: {ttsMode === "edge" ? "Edge" : ttsMode === "gemini" ? "Gemini (chat)" : ttsMode === "google" ? "Google" : "navegador"}
          </span>
        </div>
        <textarea
          className="dict-input"
          value={listeningText}
          onChange={(e) => setListeningText(e.target.value)}
          placeholder="Escribe aquí lo que oíste…"
          rows={5}
        />
      </div>

      <div className="exam-section">
        <div className="suggest-title">2 · Gramática</div>
        {grammarQs.map((q, i) => (
          <div key={i} className="exam-q">
            <div className="exam-q-text">
              {i + 1}. {q.q}
            </div>
            <div className="exam-options">
              {q.options.map((opt, oi) => (
                <label key={oi} className={`exam-option ${answers[i] === oi ? "sel" : ""}`}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === oi}
                    onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="dict-actions">
        <button className="chip-btn" onClick={onClose}>Cancelar</button>
        <button className="start-btn" onClick={finish}>
          Entregar examen →
        </button>
      </div>
    </div>
  );
}
