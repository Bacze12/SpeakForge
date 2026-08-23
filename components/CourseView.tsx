"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { conceptById } from "@/lib/knowledge";
import { LESSONS, lessonStatus } from "@/lib/course";
import { LEVELS, levelConceptsFor, type TutorState, type Level } from "@/lib/learner";

const PAGE = 3;

export default function CourseView({
  state,
  onStartLesson,
  onGoPractice,
}: {
  state: TutorState;
  onStartLesson: (lessonId: string, concepts: string[], quick?: boolean) => void;
  onGoPractice: (conceptId: string) => void;
}) {
  const [filterLevel, setFilterLevel] = useState<Level | "all">(state.level);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const levelIdx = LEVELS.indexOf(state.level);
  const allowedLevels = LEVELS.slice(0, levelIdx + 1);

  const masteryForLevel = (lv: Level) => {
    const ids = levelConceptsFor({ ...state, level: lv } as TutorState);
    if (!ids.length) return 0;
    const sum = ids.reduce((a, id) => a + (state.concepts[id]?.mastery ?? 0), 0);
    return Math.round((sum / ids.length) * 100);
  };

  const lessons = useMemo(() => {
    const base = filterLevel === "all" ? LESSONS : LESSONS.filter((l) => l.level === filterLevel);
    const normalizedQuery = query.trim().toLowerCase();
    return base.filter((l) => {
      if (!allowedLevels.includes(l.level)) return false;
      if (!normalizedQuery) return true;
      const conceptText = l.concepts
        .map((id) => conceptById(id))
        .filter(Boolean)
        .map((c) => `${c?.name || ""} ${c?.pattern || ""}`)
        .join(" ");
      return `${l.title} ${l.description} ${l.level} ${conceptText}`.toLowerCase().includes(normalizedQuery);
    });
  }, [filterLevel, allowedLevels, query]);

  const shown = lessons.slice(0, visible);

  const revealMore = () => {
    setVisible((v) => (v + 1 <= lessons.length ? v + 1 : v));
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) revealMore();
      },
      { rootMargin: "120px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown.length, lessons.length]);

  const statusOf = (id: string, level: Level, concepts: string[]) =>
    lessonStatus(level, state.level, !!state.course[id]?.done, concepts.map((c) => state.concepts[c]?.mastery ?? 0));

  const validated = LESSONS.filter((l) => statusOf(l.id, l.level, l.concepts) === "done").length;
  const optionalCount = LESSONS.filter((l) => statusOf(l.id, l.level, l.concepts) === "optional").length;

  return (
    <div className="course-wrap">
      <div className="panel">
        <div className="panel-head">
          <span className="suggest-title">📚 Curso — plan de estudio por conceptos</span>
          <span className="suggest-sub">
            {validated}/{LESSONS.length} lecciones validadas · {optionalCount} opcionales (niveles previos) ·
            contenido disponible hasta {state.level}
          </span>
        </div>

        <label className="course-search">
          <span>Buscar cursos o conceptos</span>
          <input
            className="onb-input"
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisible(PAGE); }}
            placeholder="Ej: presente, entrevistas, viajes..."
          />
        </label>

        <div className="course-levels">
          <button className={`chip-btn ${filterLevel === "all" ? "active" : ""}`} onClick={() => { setFilterLevel("all"); setVisible(PAGE); }}>
            Todo
          </button>
          {allowedLevels.map((l) => (
            <button
              key={l}
              className={`chip-btn ${filterLevel === l ? "active" : ""}`}
              onClick={() => { setFilterLevel(l); setVisible(PAGE); }}
            >
              {l} <span className="lvl-pct">{masteryForLevel(l)}%</span>
            </button>
          ))}
        </div>

        <div className="lesson-list course-scroll">
          {shown.map((l) => {
            const prog = state.course[l.id];
            const started = !!prog && !prog.done;
            const status = statusOf(l.id, l.level, l.concepts);
            return (
              <div key={l.id} className={`lesson-card ${status === "done" ? "done" : ""} ${status === "optional" ? "optional" : ""}`}>
                <div className="lesson-top">
                  <div>
                    <div className="lesson-title">
                      {l.title} <span className="lvl-badge">{l.level}</span>
                    </div>
                    <div className="lesson-desc">{l.description}</div>
                  </div>
                  {status === "done" && <span className="lesson-ok">Completada ✓</span>}
                  {status === "optional" && <span className="lesson-super">Nivel superado</span>}
                </div>
                <div className="lesson-concepts">
                  {l.concepts.map((c) => {
                    const cdef = conceptById(c);
                    const m = state.concepts[c]?.mastery ?? 0;
                    return (
                      <button key={c} className={`lesson-concept ${m >= 0.8 ? "mastered" : m > 0 ? "inprog" : ""}`} onClick={() => onGoPractice(c)}>
                        <span className="lc-name">{cdef?.name || c}</span>
                        <span className="lc-mastery">{Math.round(m * 100)}%</span>
                      </button>
                    );
                  })}
                </div>
                <div className="lesson-actions">
                  {status === "pending" && !started && (
                    <button className="start-btn" onClick={() => onStartLesson(l.id, l.concepts)}>
                      Empezar lección →
                    </button>
                  )}
                  {status === "pending" && started && (
                    <span className="lesson-inprog">En práctica — completa sus conceptos para cerrarla.</span>
                  )}
                  {status === "optional" && (
                    <>
                      <button className="start-btn" onClick={() => onStartLesson(l.id, l.concepts, true)}>
                        ⚡ Validación rápida
                      </button>
                      <button className="chip-btn" onClick={() => onStartLesson(l.id, l.concepts)}>
                        Lección completa →
                      </button>
                    </>
                  )}
                  {status === "done" && (
                    <button className="chip-btn" onClick={() => onGoPractice(l.concepts[0])}>
                      🔁 Repasar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {visible < lessons.length && <div ref={sentinelRef} className="course-sentinel">…</div>}
        </div>
        {lessons.length === 0 && <div className="empty-box">No hay lecciones para este filtro.</div>}
      </div>
    </div>
  );
}