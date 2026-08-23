"use client";

import { conceptById } from "@/lib/knowledge";
import { isContextId, type ContextId } from "@/lib/contextEngine";
import { dueReviews, dueLabel, wordErrors, type TutorState } from "@/lib/learner";

export default function ReviewView({
  state,
  onGoSpeak,
  onMarkErrorFixed,
}: {
  state: TutorState;
  onGoSpeak: (conceptId: string, context?: ContextId) => void;
  onMarkErrorFixed: (errorId: string) => void;
}) {
  const due = dueReviews(state, 10);
  const openErrors = state.errors
    .filter((e) => !e.successAfter)
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);
  const words = wordErrors(state).slice(0, 8);

  return (
    <div className="review-wrap">
      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">🔁 Repasos pendientes (repetición espaciada)</span>
        </div>
        {due.length === 0 ? (
          <div className="empty-box">🎉 No tienes repasos pendientes hoy. Vuelve mañana para reforzar lo aprendido.</div>
        ) : (
          <div className="review-list">
            {due.map((r) => {
              const c = conceptById(r.id);
              if (!c) return null;
              return (
                <div className="review-item" key={r.id}>
                  <div className="review-info">
                    <div className="review-name">
                      {c.name} <span className="lvl-badge">{c.level}</span>
                    </div>
                    <div className="review-meta">
                        Dominio {Math.round(r.mastery * 100)}% · prioridad adaptativa · vence {dueLabel(r.due)}
                    </div>
                  </div>
                  <div className="review-actions">
                    <button className="chip-btn" onClick={() => onGoSpeak(r.id)}>
                        🗣 Empezar repaso
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openErrors.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="suggest-title">🔧 Corrige tus errores recientes</span>
          </div>
          <div className="errorfix-list">
            {openErrors.map((e) => {
              const c = conceptById(e.concept);
              return (
                <div className="errorfix-card" key={e.id}>
                  <div className="errorfix-top">
                    <span className="errorfix-badge">{c?.name || e.concept}</span>
                    <span className="errorfix-context">contexto: {e.context || "general"}</span>
                  </div>
                  <div className="errorfix-line">
                    <span className="errorfix-wrong">✗ {e.wrong}</span>
                    <span className="errorfix-arrow">→</span>
                    <span className="errorfix-right">✓ {e.correct}</span>
                  </div>
                  <div className="errorfix-why">🧠 {e.why}</div>
                  <div className="errorfix-actions">
                    <button className="chip-btn" onClick={() => onGoSpeak(e.concept, isContextId(e.context) ? e.context : undefined)}>
                      🗣 Practicarlo
                    </button>
                    <button className="chip-btn good" onClick={() => onMarkErrorFixed(e.id)}>
                      ✅ Corregido (ya no me equivoco)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">📊 Errores frecuentes por palabra</span>
          <span className="suggest-sub">
            Todas tus equivocaciones registradas, ordenadas por frecuencia. Al practicar su concepto, marcar "Corregido" las limpia.
          </span>
        </div>
        {words.length === 0 ? (
          <div className="empty-box">✨ Sin errores registrados todavía.</div>
        ) : (
          <div className="worderr-table">
            {words.map((w) => {
              const c = conceptById(w.concept);
              return (
                <div className="worderr-row" key={w.word}>
                  <span className="worderr-count">{w.count}×</span>
                  <span className="worderr-word">{w.word}</span>
                  <span className="worderr-arrow">→</span>
                  <span className="worderr-correct">{w.correct || "—"}</span>
                  <span className="worderr-concept">{c?.name || w.concept}</span>
                  <button className="chip-btn" onClick={() => onGoSpeak(w.concept)}>
                    🗣
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}