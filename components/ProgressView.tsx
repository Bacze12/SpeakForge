"use client";

import { conceptById } from "@/lib/knowledge";
import { abilities, skillLabel, skillList, weakPoints } from "@/lib/learner";
import type { TutorState } from "@/lib/learner";

export default function ProgressView({
  state,
  onGoPractice,
  onRemoveError,
}: {
  state: TutorState;
  onGoPractice: (conceptId: string) => void;
  onRemoveError: (id: string) => void;
}) {
  const ab = abilities(state);
  const weak = weakPoints(state);
  const skills = skillList().map((k) => ({ k, v: state.skills[k] ?? 0 }));

  return (
    <div className="progress-grid">
      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">🎯 Capacidades funcionales</span>
          <span className="suggest-sub">Lo que puedes HACER en inglés, no lecciones completadas.</span>
        </div>
        {ab.map((a) => (
          <div className="abil" key={a.id}>
            <span className="abil-label">
              {a.label}
              {a.pct === 0 && <span className="abil-new"> nuevo</span>}
            </span>
            <div className="abil-bar">
              <div className="abil-fill" style={{ width: `${Math.max(a.pct, a.pct > 0 ? 4 : 0)}%` }}></div>
            </div>
            <span className="abil-pct">{a.pct}%</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">⚙️ Habilidades</span>
        </div>
        {skills.map(({ k, v }) => (
          <div className="abil" key={k}>
            <span className="abil-label">{skillLabel(k)}</span>
            <div className="abil-bar">
              <div className="abil-fill" style={{ width: `${Math.round(v * 100)}%` }}></div>
            </div>
            <span className="abil-pct">{Math.round(v * 100)}%</span>
          </div>
        ))}
      </div>

      {(() => {
        const sp = state.speed;
        const fmt = (e?: { mu: number; n: number }) =>
          e && e.n > 0 ? `${(e.mu / 1000).toFixed(1)}s` : "—";
        const samples = (sp?.voice.n || 0) + (sp?.text.n || 0);
        if (samples === 0) return null;
        return (
          <div className="panel">
            <div className="panel-head">
              <span className="suggest-title">⏱ Tu velocidad de respuesta</span>
              <span className="suggest-sub">Comparada contigo mismo: responder lento a veces es pensar bien.</span>
            </div>
            <div className="speed-row"><span>🎤 Hablando</span><b>{fmt(sp?.voice)}</b></div>
            <div className="speed-row"><span>⌨️ Escribiendo</span><b>{fmt(sp?.text)}</b></div>
            <div className="speed-note">
              {samples < 5
                ? `Recolectando datos (${samples}/5)… tu baseline personal se activa pronto.`
                : "Tu velocidad ya puntúa contra tu propia media: rápido y correcto suma fluidez."}
            </div>
          </div>
        );
      })()}

      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">⚠️ Puntos débiles</span>
        </div>
        {weak.length === 0 ? (
          <div className="empty-box">Sin puntos débiles marcados aún. Practica y verás esta lista llenarse con lo que más necesitas.</div>
        ) : (
          <div className="weak-list">
            {weak.map((w) => (
              <button key={w.id} className="weak-item" onClick={() => !w.id.startsWith("skill:") && onGoPractice(w.id)}>
                <span className="weak-name">{w.name}</span>
                <span className="weak-pct">{Math.round(w.mastery * 100)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">📚 Conceptos</span>
        </div>
        <div className="concept-list">
          {Object.entries(state.concepts)
            .sort((a, b) => b[1].mastery - a[1].mastery)
            .map(([id, st]) => {
              const c = conceptById(id);
              return (
                <button key={id} className="concept-row" onClick={() => onGoPractice(id)}>
                  <span className="concept-name">{c?.name || id}</span>
                  <div className="abil-bar small">
                    <div className="abil-fill" style={{ width: `${Math.round(st.mastery * 100)}%` }}></div>
                  </div>
                  <span className="concept-pct">{Math.round(st.mastery * 100)}%</span>
                </button>
              );
            })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">📓 Registro de errores</span>
        </div>
        {state.errors.length === 0 ? (
          <div className="empty-box">Aún no hay errores registrados. Los errores que cometas al construir frases se guardarán aquí para repasarlos.</div>
        ) : (
          <div className="error-list">
            {state.errors
              .slice()
              .reverse()
              .map((e) => {
                const c = conceptById(e.concept);
                return (
                  <div className="error-item" key={e.id}>
                    <div className="error-top">
                      <span className="error-concept">{c?.name || e.concept}</span>
                      <button className="x" onClick={() => onRemoveError(e.id)}>
                        ✕
                      </button>
                    </div>
                    <div className="error-wrong">✗ {e.wrong}</div>
                    <div className="error-right">✓ {e.correct}</div>
                    {e.why && <div className="error-why">{e.why}</div>}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}