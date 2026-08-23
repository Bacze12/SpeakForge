"use client";

import {
  abilities,
  dailyGoals,
  xpLevelProgress,
  type TutorState,
} from "@/lib/learner";

export default function TodayView({
  state,
  onGo,
  onToggleGoal,
}: {
  state: TutorState;
  onGo: (tab: string, conceptId?: string) => void;
  onToggleGoal: (id: string) => void;
}) {
  const goals = dailyGoals(state);
  const ab = abilities(state).slice(0, 4);
  const xp = xpLevelProgress(state.xp);

  return (
    <div className="today-wrap">
      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">🏠 Hoy — 15 minutos</span>
        </div>
        <div className="stats-row">
          <div className="xp-bar-row">
            <span className="xp-label">⚡ Nivel {xp.level} · XP</span>
            <div className="abil-bar" style={{ flex: 1 }}>
              <div className="abil-fill xp-fill" style={{ width: `${Math.max(xp.pct, 3)}%` }}></div>
            </div>
            <span className="abil-pct">{state.xp} XP</span>
          </div>
        </div>
        <div className="mission-steps">
          {goals.map((g) => (
            <div key={g.id} className={`mission-step ${g.done ? "done" : ""}`}>
              <button
                className="mission-check"
                onClick={() => onToggleGoal(g.id)}
                aria-label={g.done ? "Desmarcar" : "Marcar hecho"}
              >
                {g.done ? "✅" : "○"}
              </button>
              <button className="mission-body" onClick={() => onGo(g.tab, g.conceptId)} disabled={g.done}>
                <span className="ms-icon">{g.icon}</span>
                <span className="ms-body">
                  <span className={`ms-title ${g.done ? "strike" : ""}`}>{g.title}</span>
                  <span className="ms-sub">{g.sub}</span>
                </span>
                <span className="ms-go">{g.done ? "Hecho ✓" : "Ir →"}</span>
              </button>
            </div>
          ))}
          <div className="mission-done">
            <span className="ms-icon">✨</span>
            <span className="ms-body">
              <span className="ms-title">Constancia &gt; cantidad</span>
              <span className="ms-sub">
                {goals.filter((g) => g.done).length} de {goals.length} metas de hoy. Vuelve mañana y continúa.
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">📊 Lo que ya puedes hacer</span>
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
        <button className="chip-btn" style={{ marginTop: 10 }} onClick={() => onGo("progress")}>
          Ver progreso completo →
        </button>
      </div>
    </div>
  );
}