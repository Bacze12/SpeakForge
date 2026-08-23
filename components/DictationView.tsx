"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compareDictation, dictationsForLevel, werLabel, type Dictation } from "@/lib/dictation";
import { LEVELS, type Level, type TutorState } from "@/lib/learner";

type Props = {
  state: TutorState;
  onRecord: (wer: number) => void;
};

function fmtTime(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (!en.length) return null;
  const preferred = [
    "Google US English",
    "Google UK English Female",
    "Google UK English Male",
    "Microsoft Aria",
    "Microsoft Jenny",
    "Microsoft Michelle",
    "Samantha",
    "Microsoft Zira",
  ];
  for (const p of preferred) {
    const hit = en.find((v) => v.name.toLowerCase().includes(p.toLowerCase()));
    if (hit) return hit;
  }
  return en[0];
}

export default function DictationView({ state, onRecord }: Props) {
  const levelIdx = LEVELS.indexOf(state.level);
  const maxLevel = LEVELS[Math.min(levelIdx + 1, LEVELS.length - 1)];
  const allowedLevels = LEVELS.slice(0, LEVELS.indexOf(maxLevel) + 1);
  const [level, setLevel] = useState<Level>(state.level);
  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof compareDictation> | null>(null);
  const [plays, setPlays] = useState(0);
  const [slow, setSlow] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [ttsMode, setTtsMode] = useState<"edge" | "gemini" | "google" | "browser">("browser");
  const [progTime, setProgTime] = useState(0);
  const [progDur, setProgDur] = useState(0);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const pool = useMemo(() => dictationsForLevel(level), [level]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    voiceRef.current = pickVoice();
    const load = () => {
      voiceRef.current = pickVoice();
    };
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!dictation) {
      setDictation(pool[Math.floor(Math.random() * pool.length)] || null);
    }
  }, [pool, dictation]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    const iv = setInterval(() => {
      const el = audioRef.current;
      if (el && Number.isFinite(el.duration)) {
        setProgTime(el.currentTime);
        setProgDur(el.duration);
      }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  const googleSpeak = async (rate: number) => {
    if (!dictation) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dictation.text, lang: "en-US", rate }),
      });
      if (res.status === 501) {
        setTtsMode("browser");
        return false;
      }
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.audio) return false;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const b64 = data.audio as string;
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: (data.mimeType as string) || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const eng = data.engine as "edge" | "gemini" | "google";
      setTtsMode(eng === "gemini" ? "gemini" : eng === "edge" ? "edge" : "google");
      const el = audioRef.current;
      if (el) {
        el.src = url;
        el.onended = () => {
          setPaused(false);
          setStarted(false);
        };
        await el.play();
        setStarted(true);
        setPaused(false);
      }
      return true;
    } catch {
      return false;
    }
  };

  const browserSpeak = () => {
    if (!dictation || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(dictation.text);
    u.lang = "en-US";
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = slow ? 0.6 : level === "A1" ? 0.75 : 0.85;
    u.pitch = 1;
    u.onend = () => {
      setPaused(false);
      setStarted(false);
    };
    synthRef.current = u;
    synth.speak(u);
    setStarted(true);
    setPaused(false);
  };

  const speak = async () => {
    if (!dictation) return;
    window.speechSynthesis?.cancel();
    const rate = slow ? 0.8 : level === "A1" ? 0.9 : 1;
    const ok = await googleSpeak(rate);
    if (ok) {
      setPlays((p) => p + 1);
      return;
    }
    setTtsMode("browser");
    browserSpeak();
    setPlays((p) => p + 1);
  };

  const pauseResume = () => {
    if (!dictation) return;
    if (ttsMode === "edge" || ttsMode === "google" || ttsMode === "gemini") {
      const el = audioRef.current;
      if (!el) return;
      if (paused) {
        el.play();
        setPaused(false);
      } else {
        el.pause();
        setPaused(true);
      }
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (paused) {
      synth.resume();
      setPaused(false);
    } else {
      synth.pause();
      setPaused(true);
    }
  };

  const seekBy = (delta: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration === 0) return;
    el.currentTime = Math.max(0, Math.min(el.currentTime + delta, el.duration));
    setProgTime(el.currentTime);
    setProgDur(el.duration);
  };

  const stop = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setPaused(false);
    setStarted(false);
  };

  const check = () => {
    if (!dictation) return;
    const r = compareDictation(text, dictation.text);
    setResult(r);
    onRecord(r.wer);
  };

  const next = () => {
    stop();
    const poolNow = dictationsForLevel(level);
    const others = poolNow.filter((d) => d.id !== dictation?.id);
    setDictation(others[Math.floor(Math.random() * others.length)] || poolNow[0] || null);
    setText("");
    setResult(null);
    setPlays(0);
    setPaused(false);
    setStarted(false);
  };

  const pickLevel = (l: Level) => {
    setLevel(l);
    setDictation(null);
    setText("");
    setResult(null);
    setPlays(0);
    setPaused(false);
    setStarted(false);
  };

  if (!dictation) return <div className="panel">No hay dictados para este nivel.</div>;

  const listeningOk = "speechSynthesis" in (typeof window !== "undefined" ? window : {});
  const wer = result?.wer ?? 0;

  return (
    <div className="panel dict-wrap">
      <div className="panel-head">
        <span className="suggest-title">👂 Práctica de dictado — {level}</span>
        <span className="suggest-sub">
          Escucha, pausa y repite las veces que quieras. Escribe todo lo que oyes y compáralo palabra por palabra.
        </span>
      </div>

      <div className="dict-levels">
        {allowedLevels.map((l) => (
          <button
            key={l}
            className={`chip-btn ${l === level ? "active" : ""}`}
            onClick={() => pickLevel(l)}
          >
            {l}
          </button>
        ))}
        <span className="dict-plays" style={{ marginLeft: 8 }}>
          Solo tu nivel y uno más para no frustrarte antes de tiempo.
        </span>
      </div>

      <div className="dict-story">
        <audio ref={audioRef} style={{ display: "none" }} />
        <div className="dict-title">{dictation.title}</div>
        <div className="dict-actions">
          <button className="chip-btn primary" onClick={speak} disabled={!listeningOk}>
            ▶ Escuchar
          </button>
          <button className="chip-btn" onClick={pauseResume} disabled={!started || !listeningOk}>
            {paused ? "▶ Reanudar" : "⏸ Pausa"}
          </button>
          <button className="chip-btn" onClick={stop} disabled={!started}>
            ■ Detener
          </button>
          <button className={`chip-btn ${slow ? "active" : ""}`} onClick={() => setSlow((v) => !v)}>
            🐢 Lento
          </button>
        </div>
        {progDur > 0 && (
          <div className="dict-seek">
            <button className="chip-btn" onClick={() => seekBy(-5)} title="Retroceder 5s">⏪5s</button>
            <span className="dict-prog">{fmtTime(progTime)} / {fmtTime(progDur)}</span>
            <button className="chip-btn" onClick={() => seekBy(5)} title="Avanzar 5s">5s⏩</button>
          </div>
        )}
        <div className="dict-plays">
          Reproducciones: {plays} · voz: {ttsMode === "edge" ? "Edge" : ttsMode === "gemini" ? "Gemini (chat)" : ttsMode === "google" ? "Google" : "navegador"}{" "}
          {!listeningOk && "· TTS no disponible en este navegador"}
        </div>
      </div>

      <textarea
        className="dict-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe aquí todo lo que escuchas…"
        rows={5}
      />

      <div className="dict-actions">
        <button className="start-btn" onClick={check} disabled={!text.trim()}>
          Comprobar →
        </button>
        <button className="chip-btn" onClick={next}>
          Otra historia
        </button>
      </div>

      {result && (
        <div className={`dict-result ${wer <= 0.25 ? "good" : wer <= 0.4 ? "mid" : "bad"}`}>
          <div className="dict-score">
            Tasa de error: {Math.round(wer * 100)}% · {werLabel(wer)}
          </div>
          <div className="dict-stats">
            <span className="ok">✓ {result.correct} aciertos</span>
            <span className="bad">✗ {result.wrong} errores</span>
            <span className="miss">- {result.missing} faltantes</span>
            <span className="extra">+ {result.extra} sobrantes</span>
          </div>
          <div className="dict-ref">
            {result.refWords.map((w, i) => (
              <span key={i} className={`dict-word ${w.status}`}>
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
