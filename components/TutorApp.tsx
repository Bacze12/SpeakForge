"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONCEPTS, conceptById } from "@/lib/knowledge";
import { buildPractice, isContextId, type ContextId } from "@/lib/contextEngine";
import {
  loadState,
  saveState,
  emptyState,
  seedFromDiagnostic,
  recordAttempt,
  recordError,
  recordListening,
  recordPronunciation,
  promoteLevel,
  startCourse,
  completeLesson,
  nextConcept,
  planStats,
  toggleGoal,
  markErrorFixed,
  canRunDiagnostic,
  diagnosticNextDate,
  updateSpeedBaseline,
  type TutorState,
  type Profile,
  type Level,
  type ExamResult,
} from "@/lib/learner";
import InterviewTrainer, { type Mode } from "@/components/InterviewTrainer";
import { LESSONS, lessonById } from "@/lib/course";
import { backupToCloud, restoreFromCloud, getDeviceId, restoreLatestForUser, fetchMe } from "@/lib/sync";
import AuthModal from "@/components/AuthModal";
import Onboarding from "@/components/Onboarding";
import TodayView from "@/components/TodayView";
import ReviewView from "@/components/ReviewView";
import ProgressView from "@/components/ProgressView";
import CourseView from "@/components/CourseView";
import LessonFlow from "@/components/LessonFlow";
import DictationView from "@/components/DictationView";
import ExamView from "@/components/ExamView";
import PronunciationView from "@/components/PronunciationView";

type Tab = "today" | "review" | "progress" | "course" | "voice" | "exam" | "pron";

const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "review", label: "Repasar" },
  { id: "progress", label: "Progreso" },
  { id: "course", label: "Curso" },
  { id: "voice", label: "Hablar" },
  { id: "exam", label: "Examen" },
  { id: "pron", label: "Pronunciar" },
];

export default function TutorApp() {
  const [state, setState] = useState<TutorState>(() => emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [quickLesson, setQuickLesson] = useState(false);
  const [voiceCtx, setVoiceCtx] = useState<{ mode: Mode; starter?: string; topic?: string; conceptId?: string }>({ mode: "libre" });
  const [examView, setExamView] = useState<"dictation" | "exam">("dictation");
  const [cloudMsg, setCloudMsg] = useState("");
  const [cloud, setCloud] = useState<{ s: "idle" | "syncing" | "ok" | "error"; at: number; error?: string }>({ s: "idle", at: 0 });
  const lastSyncJsonRef = useRef("");
  const lastSyncAtRef = useRef(0);
  const [session, setSession] = useState<{ id: string; email: string; name: string } | null>(null);
  const sessionRef = useRef(session);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  const commit = useCallback((s: TutorState) => {
    setState(s);
    saveState(s);
  }, []);

  /* ---- Auto-sincronización con Turso ---- */
  const pushSync = useCallback(async (s: TutorState): Promise<boolean> => {
    const json = JSON.stringify(s);
    if (json === lastSyncJsonRef.current) return true;
    setCloud({ s: "syncing", at: 0 });
    const r = await backupToCloud(s, sessionRef.current?.id);
    if (r.ok) {
      lastSyncJsonRef.current = json;
      lastSyncAtRef.current = Date.now();
      setCloud({ s: "ok", at: Date.now() });
      return true;
    }
    setCloud({ s: "error", at: Date.now(), error: r.error });
    return false;
  }, []);

  // Sesión actual al montar.
  useEffect(() => {
    void fetchMe().then((u) => {
      sessionRef.current = u;
      setSession(u);
    });
  }, []);

  // Debounce 4s tras cada cambio de estado.
  useEffect(() => {
    if (!hydrated || !state.onboarded) return;
    const t = setTimeout(() => {
      void pushSync(state);
    }, 4000);
    return () => clearTimeout(t);
  }, [state, hydrated, pushSync]);

  // Beacon al ocultar/cerrar la pestaña para no perder el último cambio.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    const onHide = () => {
      try {
        const s = stateRef.current;
        if (!s.onboarded) return;
        if (JSON.stringify(s) === lastSyncJsonRef.current) return;
        const payload = JSON.stringify({ deviceId: getDeviceId(), level: s.level, xp: s.xp, state: s });
        navigator.sendBeacon("/api/sync", new Blob([payload], { type: "application/json" }));
        lastSyncJsonRef.current = JSON.stringify(s);
        setCloud((c) => ({ ...c, s: "ok", at: Date.now() }));
      } catch {}
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  const handleAttempt = useCallback(
    (c: string, o: { success: boolean; helpUsed?: number; wrong?: string; correct?: string; mode?: "voice" | "text"; responseMs?: number }) => {
      setState((prev) => {
        const n = recordAttempt(prev, c, o);
        saveState(n);
        return n;
      });
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "attempt", deviceId: getDeviceId(), conceptId: c, ...o }),
      }).catch(() => {});
    },
    []
  );

  const handleProfile = useCallback((p: Profile) => {
    setState((prev) => {
      const n = { ...prev, onboarded: true, profile: p };
      saveState(n);
      return n;
    });
  }, []);

  const handleSkip = useCallback(() => {
    const profile: Profile = {
      native: "Español",
      target: "English",
      goals: ["conversation"],
      profession: "",
      interests: ["technology"],
      situations: ["casual_talk"],
    };
    commit({ ...state, onboarded: true, profile });
  }, [commit, state]);

  const handleDiagnostic = useCallback(
    (level: Level) => {
      setState((prev) => {
        const n = seedFromDiagnostic(prev, level);
        saveState(n);
        return n;
      });
    },
    []
  );

  const handleLatency = useCallback((ms: number, mode: "voice" | "text") => {
    setState((prev) => {
      const n = updateSpeedBaseline(prev, mode, ms);
      saveState(n);
      return n;
    });
  }, []);

  const handleBackup = useCallback(async () => {
    setCloudMsg("☁ Respaldando…");
    const ok = await pushSync(state);
    setCloudMsg(ok ? "✅ Progreso respaldado en la nube" : `❌ Error al respaldar${cloud.error ? `: ${cloud.error}` : ""}`);
  }, [state, pushSync, cloud.error]);

  // Al iniciar sesión: gana el más reciente (nube vs local).
  const handleAuthed = useCallback(
    async (user: { id: string; email: string; name: string }) => {
      sessionRef.current = user;
      setSession(user);
      setAuthOpen(false);
      const r = await restoreLatestForUser(user.id);
      if (r.ok && r.state && (r.updatedAt ?? 0) > lastSyncAtRef.current) {
        commit(r.state);
        lastSyncJsonRef.current = JSON.stringify(r.state);
        lastSyncAtRef.current = Date.now();
        setCloudMsg("☁ Progreso restaurado desde tu cuenta (era más reciente que este dispositivo)");
      } else {
        setCloudMsg("☁ Sesión iniciada · subiendo el progreso de este dispositivo a tu cuenta…");
        await pushSync(state);
        setCloudMsg("✅ Sesión iniciada · progreso sincronizado con tu cuenta");
      }
    },
    [commit, pushSync, state]
  );

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    sessionRef.current = null;
    setSession(null);
    setCloudMsg("Sesión cerrada. El progreso sigue guardado en este dispositivo.");
  }, []);

  const handleRestore = useCallback(async () => {
    setCloudMsg("⬇ Restaurando…");
    const r = await restoreFromCloud();
    if (!r.ok) {
      setCloudMsg(r.error === "no_backup" ? "⚠ No hay respaldo para este dispositivo" : `❌ Error al restaurar: ${r.error}`);
      return;
    }
    if (r.state) {
      commit(r.state);
      setCloudMsg("✅ Progreso restaurado desde la nube");
    }
  }, [commit]);

  const handleRemoveError = useCallback(
    (id: string) => {
      setState((prev) => {
        const n = { ...prev, errors: prev.errors.filter((e) => e.id !== id) };
        saveState(n);
        return n;
      });
    },
    []
  );

  const handleError = useCallback(
    (c: string, o: { errorType: string; wrong: string; correct?: string; context?: string }) => {
      setState((prev) => {
        const n = recordError(prev, c, o);
        saveState(n);
        return n;
      });
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "error", deviceId: getDeviceId(), conceptId: c, ...o }),
      }).catch(() => {});
    },
    []
  );

  const handleListening = useCallback((wer: number) => {
    setState((prev) => {
      const n = recordListening(prev, wer);
      saveState(n);
      return n;
    });
  }, []);

  const handlePronunciation = useCallback((wer: number) => {
    setState((prev) => {
      const n = recordPronunciation(prev, wer);
      saveState(n);
      return n;
    });
  }, []);

  const handleExamPass = useCallback((_r: ExamResult) => {
    setState((prev) => {
      const n = promoteLevel(prev);
      saveState(n);
      return n;
    });
  }, []);

  const handleToggleGoal = useCallback((id: string) => {
    setState((prev) => {
      const n = toggleGoal(prev, id);
      saveState(n);
      return n;
    });
  }, []);

  const handleMarkErrorFixed = useCallback((errorId: string) => {
    setState((prev) => {
      const n = markErrorFixed(prev, errorId);
      saveState(n);
      return n;
    });
  }, []);

  const handleStartLesson = useCallback((lessonId: string, concepts: string[], quick?: boolean) => {
    setState((prev) => {
      const n = startCourse(prev, lessonId, concepts);
      saveState(n);
      return n;
    });
    setQuickLesson(!!quick);
    setActiveLesson(lessonId);
    setTab("course");
  }, []);

  const handleCompleteLesson = useCallback((lessonId: string) => {
    setState((prev) => {
      const n = completeLesson(prev, lessonId);
      saveState(n);
      return n;
    });
    setQuickLesson(false);
    setActiveLesson(null);
  }, []);

  const openConceptInCourse = useCallback((conceptId?: string) => {
    const lesson = conceptId ? LESSONS.find((item) => item.concepts.includes(conceptId)) : undefined;
    if (lesson) {
      setQuickLesson(false);
      setActiveLesson(lesson.id);
    }
    setTab("course");
  }, []);

  const goSpeak = useCallback(
    (conceptId: string, context?: ContextId) => {
      const c = conceptById(conceptId);
      const interest = state.profile?.interests?.[0];
      const targetCtx: ContextId = context && isContextId(context)
        ? context
        : interest && isContextId(interest)
        ? interest
        : "daily_life";
      const plan = c ? buildPractice(conceptId, targetCtx) : null;
      setVoiceCtx({
        mode: "concepto",
        topic: c ? `${c.name} (${c.id})` : "",
        conceptId,
        starter: plan ? plan.coachPrompt : undefined,
      });
      setTab("voice");
    },
    [state.profile]
  );

  const handleTodayGo = useCallback((tab: string, conceptId?: string) => {
    if (tab === "review") {
      setTab("review");
    } else if (tab === "progress") {
      setTab("progress");
    } else if (tab === "voice") {
      if (conceptId === "entrevista") setVoiceCtx({ mode: "entrevista" });
      else if (conceptId === "pro") setVoiceCtx({ mode: "pro" });
      else setVoiceCtx({ mode: "libre" });
      setTab("voice");
    } else {
      openConceptInCourse(conceptId);
    }
  }, [openConceptInCourse]);

  const handleTabClick = useCallback((t: Tab) => {
    setTab(t);
  }, []);

  const currentConcept = nextConcept(state) || CONCEPTS[0].id;

  if (!hydrated) {
    return (
      <div className="app tutor-app">
        <header className="tutor-header">
          <div className="tutor-title">
            <span className="tutor-logo">T</span>
            <div>
              <h1>SpeakForge</h1>
              <p>Cargando tu plan…</p>
            </div>
          </div>
        </header>
        <div className="panel empty-box">Preparando tu entrenamiento…</div>
      </div>
    );
  }

  if (!state.diagnosticDone) {
    return (
      <div className="app tutor-app diagnostic-gate">
        <header className="tutor-header">
          <div className="tutor-title">
            <span className="tutor-logo">S</span>
            <div>
              <h1>SpeakForge</h1>
              <p>Habla desde el primer día. Tu entrenamiento empieza con una evaluación breve.</p>
            </div>
          </div>
        </header>
        <div className="diag-gate-panel">
          <div className="diag-gate-kicker">Paso 1 de 1</div>
          <h2>Primero conozcamos tu inglés</h2>
          <p>
            Completa el diagnóstico para adaptar tus cursos, ejemplos y entrevistas a tu nivel real. Después podrás usar todo SpeakForge.
          </p>
          <InterviewTrainer
            key="initial-diagnostic"
            initialMode="diagnostico"
            compact
            onDiagnostic={handleDiagnostic}
            onDiagnosticComplete={() => setTab("course")}
            diagnosticEnabled
            onLatency={handleLatency}
          />
        </div>
        {!state.onboarded && <Onboarding onDone={handleProfile} onSkip={handleSkip} />}
      </div>
    );
  }

  return (
    <div className="app tutor-app">
      <header className="tutor-header">
        <div className="tutor-title">
          <span className="tutor-logo">T</span>
          <div>
              <h1>SpeakForge</h1>
            <p>
              Nivel <b>{state.level}</b> · {state.diagnosticDone ? "diagnóstico listo" : "sin diagnóstico aún"} ·{" "}
              {state.profile?.goals?.length ? state.profile.goals.length : 0} objetivo(s)
              {cloud.s !== "idle" && (
                <span className={`cloud-chip ${cloud.s}`}>
                  {" "}· ☁{" "}
                  {cloud.s === "syncing"
                    ? "sincronizando…"
                    : cloud.s === "ok"
                    ? `sincronizado ${new Date(cloud.at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
                    : "error de sync"}
                </span>
              )}
            </p>
          </div>
        </div>
        <nav className="tutor-nav">
          {TABS.map((t) => (
            <button key={t.id} className={`tutor-tab ${tab === t.id ? "active" : ""}`} onClick={() => handleTabClick(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="session-chip">
          {session ? (
            <>
              <span>👤 <b>{session.name || session.email}</b></span>
              <button className="chip-btn" onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <button className="chip-btn" onClick={() => setAuthOpen(true)}>Iniciar sesión</button>
          )}
        </div>
      </header>

      {!state.diagnosticDone && tab !== "voice" && (
        <div className="diag-banner">
          <b>Te falta conocer tu nivel real.</b> Ve a <b>Hablar</b> → modo <b>Diagnóstico</b> y en 5 minutos tu tutor lo
          detecta y ajusta todo tu plan.
        </div>
      )}

      {tab === "today" && <TodayView state={state} onGo={handleTodayGo} onToggleGoal={handleToggleGoal} />}

      {tab === "review" && (
        <ReviewView
          state={state}
          onGoSpeak={goSpeak}
          onMarkErrorFixed={handleMarkErrorFixed}
        />
      )}

      {tab === "progress" && (
        <>
          <ProgressView state={state} onGoPractice={openConceptInCourse} onRemoveError={handleRemoveError} />
          <div className="cloud-panel">
            <div className="cloud-title">☁ Respaldo en la nube</div>
            <p className="cloud-sub">
              Guarda tu progreso en Turso y recupéralo en cualquier momento. Se identifica por este dispositivo.
            </p>
            <div className="cloud-actions">
              <button className="chip-btn good" onClick={handleBackup}>Respaldar ahora</button>
              <button className="chip-btn" onClick={handleRestore}>Restaurar copia</button>
            </div>
            {cloudMsg && <div className="cloud-msg">{cloudMsg}</div>}
          </div>
        </>
      )}

      {tab === "course" && (
        activeLesson ? (
          (() => {
            const lesson = lessonById(activeLesson);
            if (!lesson) return null;
            return (
              <LessonFlow
                lessonId={lesson.id}
                conceptIds={lesson.concepts}
                state={state}
                quick={quickLesson}
                onAttempt={handleAttempt}
                onError={handleError}
                onGoSpeak={goSpeak}
                onComplete={() => handleCompleteLesson(lesson.id)}
              />
            );
          })()
        ) : (
          <CourseView state={state} onStartLesson={handleStartLesson} onGoPractice={openConceptInCourse} />
        )
      )}

      {tab === "exam" && (
        <div className="exam-tab">
          <div className="dict-levels">
            <button
              className={`chip-btn ${examView === "dictation" ? "active" : ""}`}
              onClick={() => setExamView("dictation")}
            >
              👂 Práctica de dictado
            </button>
            <button
              className={`chip-btn ${examView === "exam" ? "active" : ""}`}
              onClick={() => setExamView("exam")}
            >
              🏆 Examen de certificación
            </button>
          </div>
          {examView === "dictation" ? (
            <DictationView state={state} onRecord={handleListening} />
          ) : (
            <ExamView state={state} onPass={handleExamPass} onClose={() => setExamView("dictation")} />
          )}
        </div>
      )}

      {tab === "pron" && (
        <PronunciationView
          state={state}
          onRecord={handlePronunciation}
        />
      )}

      {tab === "voice" && (
        <div className="voice-shell">
          {voiceCtx.mode === "libre" && state.diagnosticDone && !canRunDiagnostic(state) && (
            <div className="diag-banner">
              Tu diagnóstico ya está actualizado. Podrás repetirlo el {new Date(diagnosticNextDate(state) || 0).toLocaleDateString("es-ES")}.
            </div>
          )}
          <InterviewTrainer
            key={`${voiceCtx.mode}:${voiceCtx.topic || voiceCtx.starter || ""}`}
            initialMode={voiceCtx.mode}
            starterPrompt={voiceCtx.starter}
            compact
            onDiagnostic={handleDiagnostic}
            onDiagnosticComplete={() => setTab("course")}
            onConceptComplete={() => setTab("course")}
            planStats={planStats(state)}
            topicOverride={voiceCtx.topic}
            targetConcepts={voiceCtx.mode === "concepto" ? [voiceCtx.conceptId || currentConcept] : undefined}
            diagnosticEnabled={canRunDiagnostic(state)}
            recentErrors={state.errors
              .slice(0, 5)
              .map((e) => ({ wrong: e.wrong, right: e.correct, type: e.type, context: e.context }))}
            onLatency={handleLatency}
          />
        </div>
      )}

      {!state.onboarded && (
        <Onboarding onDone={handleProfile} onSkip={handleSkip} />
      )}

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthed={(user) => void handleAuthed(user)}
        />
      )}
    </div>
  );
}