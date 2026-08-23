"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compareDictation, werLabel, type DictationResult } from "@/lib/dictation";
import { pronSentencesForLevel, randomMinimalPair, PRON_SENTENCES, type MinimalPair } from "@/lib/pronunciation";
import type { Level, TutorState } from "@/lib/learner";
import { TtsPlayer } from "@/lib/tts";

type Props = {
  state: TutorState;
  onRecord: (wer: number) => void;
};

function fmtTime(s: number): string {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

type AnyWindow = Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any };

export default function PronunciationView({ state, onRecord }: Props) {
  const [mode, setMode] = useState<"sentence" | "pairs" | "video">("sentence");
  const [level, setLevel] = useState<Level>(state.level);
  const [sentence, setSentence] = useState<(typeof PRON_SENTENCES)[number] | null>(null);
  const [pair, setPair] = useState<MinimalPair | null>(null);
  const [pairTarget, setPairTarget] = useState<"a" | "b">("a");
  const [pairResult, setPairResult] = useState<"hit" | "miss" | null>(null);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState<DictationResult | null>(null);
  const [replayUrl, setReplayUrl] = useState<string>("");
  const [sttSupported, setSttSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deepResult, setDeepResult] = useState<DeepPronResult | null>(null);

  const [vidRecording, setVidRecording] = useState(false);
  const [vidUrl, setVidUrl] = useState("");
  const [vidError, setVidError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const vidRecorderRef = useRef<MediaRecorder | null>(null);
  const vidChunksRef = useRef<Blob[]>([]);
  const vidStreamRef = useRef<MediaStream | null>(null);

  const recRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastBlobRef = useRef<Blob | null>(null);

  type DeepPronResult = {
    score?: number;
    heard?: string;
    words?: { word: string; ok: boolean; tip?: string }[];
    advice?: string;
    error?: string;
  };

  const pool = useMemo(() => pronSentencesForLevel(level), [level]);
  const tts = useMemo(() => new TtsPlayer(), []);
  const [refPaused, setRefPaused] = useState(false);
  const [progTime, setProgTime] = useState(0);
  const [progDur, setProgDur] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setProgTime(tts.currentTime);
      setProgDur(tts.duration);
    }, 200);
    return () => clearInterval(iv);
  }, [tts]);

  useEffect(() => {
    return () => tts.cancel();
  }, [tts]);

  useEffect(() => {
    if (!sentence) setSentence(pool[Math.floor(Math.random() * pool.length)] || null);
  }, [pool, sentence]);
  useEffect(() => {
    if (!pair) {
      const p = randomMinimalPair();
      setPair(p);
      setPairTarget(Math.random() < 0.5 ? "a" : "b");
    }
  }, [pair]);
  useEffect(() => {
    return () => {
      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch {}
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const speakReference = (text: string, rate = 0.9) => {
    tts.speak(text, { rate });
    setRefPaused(false);
  };

  const pauseResumeRef = () => {
    if (refPaused) {
      tts.resume();
      setRefPaused(false);
    } else {
      tts.pause();
      setRefPaused(true);
    }
  };

  const seekByRef = (delta: number) => {
    tts.seek(tts.currentTime + delta);
    setProgTime(tts.currentTime);
  };

  const stopRec = () => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {}
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const record = (expected: string) => {
    const W = window as AnyWindow;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      setSttSupported(false);
      return;
    }
    if (listening) {
      stopRec();
      return;
    }
    setListening(true);
    setActive(true);
    setResult(null);
    setHeard("");
    setPairResult(null);
    if (replayUrl) {
      URL.revokeObjectURL(replayUrl);
      setReplayUrl("");
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          setHeard((h) => (h ? h + " " : "") + t.trim());
        }
      }
    };
    rec.onerror = () => {
      setListening(false);
      setActive(false);
    };
    rec.onend = () => {
      setListening(false);
      setActive(false);
    };

    // Grabar audio para reescucharse y análisis profundo
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data.size) chunksRef.current.push(e.data);
        };
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size && replayUrl) URL.revokeObjectURL(replayUrl);
          if (blob.size) {
            setReplayUrl(URL.createObjectURL(blob));
            lastBlobRef.current = blob;
          }
          stream.getTracks().forEach((t) => t.stop());
        };
        recorderRef.current = mr;
        mr.start();
        rec.start();
      })
      .catch(() => {
        // sin grabación de audio, aún podemos intentar el reconocimiento
        try {
          rec.start();
        } catch {}
      });
  };

  const grade = () => {
    if (!sentence) return;
    const r = compareDictation(heard, sentence.text);
    setResult(r);
    onRecord(r.wer);
    stopRec();
    if (lastBlobRef.current) {
      deepAnalyze();
    }
  };

  const gradePair = () => {
    if (!pair || !heard.trim()) return;
    stopRec();
    const h = heard.trim().toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
    const includesA = h.includes(pair.a);
    const includesB = h.includes(pair.b);
    if (pairTarget === "a") {
      setPairResult(includesA && !includesB ? "hit" : "miss");
    } else {
      setPairResult(includesB && !includesA ? "hit" : "miss");
    }
    const hit = pairTarget === "a" ? includesA && !includesB : includesB && !includesA;
    onRecord(hit ? 0.1 : 0.6);
  };

  const nextSentence = () => {
    const others = pool.filter((p) => p.id !== sentence?.id);
    setSentence(others[Math.floor(Math.random() * others.length)] || pool[0] || null);
    setHeard("");
    setResult(null);
  };

  const deepAnalyze = async () => {
    const blob = lastBlobRef.current;
    if (!blob) return;
    setAnalyzing(true);
    setDeepResult(null);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => {
          const s = String(fr.result || "");
          resolve(s.split(",")[1] || s);
        };
        fr.readAsDataURL(blob);
      });
      const res = await fetch("/api/pronounce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType: blob.type || "audio/webm", reference: sentence?.text || "" }),
      });
      const data: DeepPronResult = await res.json();
      setDeepResult(data);
    } catch (e) {
      setDeepResult({ error: String(e) });
    } finally {
      setAnalyzing(false);
    }
  };

  const nextPair = () => {
    const p = randomMinimalPair(pair?.id);
    setPair(p);
    setPairTarget(Math.random() < 0.5 ? "a" : "b");
    setHeard("");
    setPairResult(null);
  };

  const startVideo = async () => {
    setVidError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      vidStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const mr = new MediaRecorder(stream);
      vidChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) vidChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(vidChunksRef.current, { type: mr.mimeType || "video/webm" });
        if (vidUrl) URL.revokeObjectURL(vidUrl);
        setVidUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        vidStreamRef.current = null;
      };
      vidRecorderRef.current = mr;
      mr.start();
      setVidRecording(true);
    } catch {
      setVidError("No se pudo acceder a cámara/micrófono. Revisa el permiso del navegador.");
    }
  };

  const stopVideo = () => {
    if (vidRecorderRef.current && vidRecorderRef.current.state !== "inactive") {
      vidRecorderRef.current.stop();
    }
    setVidRecording(false);
  };

  const pickLevel = (l: Level) => {
    setLevel(l);
    setSentence(null);
    setHeard("");
    setResult(null);
  };

  return (
    <div className="panel dict-wrap">
      <div className="panel-head">
        <span className="suggest-title">🗣 Pronunciar — que te entiendan</span>
        <span className="suggest-sub">
          Habla y compara: el reconocimiento de voz (gratis, Chrome/Edge) decide si dijo la palabra correcta. Practica
          frases completas o pares mínimos (sonidos que se confunden).
        </span>
      </div>

      <div className="dict-levels">
        <button className={`chip-btn ${mode === "sentence" ? "active" : ""}`} onClick={() => setMode("sentence")}>
          Frases completas
        </button>
        <button className={`chip-btn ${mode === "pairs" ? "active" : ""}`} onClick={() => setMode("pairs")}>
          Pares mínimos
        </button>
        <button className={`chip-btn ${mode === "video" ? "active" : ""}`} onClick={() => setMode("video")}>
          📹 Grabarme en video
        </button>
      </div>

      {!sttSupported && (
        <div className="exam-unlock bad">
          ⚠️ Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge para la parte de pronunciación.
        </div>
      )}

      {mode === "sentence" ? (
        <>
          <div className="dict-levels">
            {(["A1", "A2", "B1"] as Level[]).map((l) => (
              <button key={l} className={`chip-btn ${l === level ? "active" : ""}`} onClick={() => pickLevel(l)}>
                {l}
              </button>
            ))}
          </div>
          {sentence && (
            <div className="dict-story">
              <div className="dict-title">{sentence.text}</div>
              <div className="suggest-sub">Enfócate en: {sentence.focus}</div>
              <div className="dict-actions">
                <button className="chip-btn" onClick={() => speakReference(sentence.text, 0.85)}>
                  ▶ Escuchar modelo
                </button>
                <button className="chip-btn" onClick={pauseResumeRef} disabled={progDur === 0}>
                  {refPaused ? "▶ Reanudar" : "⏸ Pausa"}
                </button>
                {progDur > 0 && (
                  <span className="dict-seek">
                    <button className="chip-btn" onClick={() => seekByRef(-5)} title="Retroceder 5s">⏪5s</button>
                    <span className="dict-prog">{fmtTime(progTime)} / {fmtTime(progDur)}</span>
                    <button className="chip-btn" onClick={() => seekByRef(5)} title="Avanzar 5s">5s⏩</button>
                  </span>
                )}
                <button
                  className={`chip-btn primary ${listening ? "active" : ""}`}
                  onClick={() => record(sentence.text)}
                  disabled={!sttSupported}
                >
                  {listening ? "● Escuchando…" : "🎙 Repite la frase"}
                </button>
                {active && (
                  <button className="chip-btn" onClick={() => stopRec()}>
                    ■ Detener
                  </button>
                )}
              </div>
            </div>
          )}
          <textarea
            className="dict-input"
            value={heard}
            onChange={(e) => setHeard(e.target.value)}
            placeholder="Lo que el sistema reconoció aparecerá aquí (puedes corregirlo a mano)…"
            rows={3}
          />
          {replayUrl && (
            <div className="dict-actions">
              <audio controls src={replayUrl} style={{ maxWidth: 300 }}>
                Tu audio
              </audio>
              <span className="dict-plays">Escúchate y compárate con el modelo.</span>
            </div>
          )}
          <div className="dict-actions">
            <button className="start-btn" onClick={grade} disabled={!heard.trim()}>
              Comparar →
            </button>
            <button className="chip-btn" onClick={nextSentence}>
              Otra frase
            </button>
          </div>
          {result && (
            <div className={`dict-result ${result.wer <= 0.25 ? "good" : result.wer <= 0.4 ? "mid" : "bad"}`}>
              <div className="dict-score">
                Tasa de error: {Math.round(result.wer * 100)}% · {werLabel(result.wer)}
              </div>
              <div className="dict-stats">
                <span className="ok">✓ {result.correct} bien</span>
                <span className="bad">✗ {result.wrong} mal</span>
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
              <div className="errorfix-why" style={{ marginTop: 10 }}>
                Las palabras en rojo son las que el reconocimiento no entendió: ahí está tu trabajo. Escúchate, repítelas
                y vuelve a intentarlo.
              </div>
            </div>
          )}
          {replayUrl && (
            <div className="dict-actions" style={{ marginTop: 12 }}>
              <button className="chip-btn" onClick={deepAnalyze} disabled={analyzing}>
                {analyzing ? "Analizando con Gemini…" : "🔬 Análisis profundo (Gemini)"}
              </button>
              <span className="dict-plays">El navegador decide si "te entendió"; Gemini escucha tu audio y puntúa 0-10 cada palabra.</span>
            </div>
          )}
          {deepResult && (
            <div className={`dict-result ${deepResult.error ? "bad" : (deepResult.score ?? 0) >= 7 ? "good" : (deepResult.score ?? 0) >= 4 ? "mid" : "bad"}`}>
              {deepResult.error ? (
                <div className="dict-score">✗ {deepResult.error}</div>
              ) : (
                <>
                  <div className="dict-score">
                    Gemini: {deepResult.score ?? 0}/10 {deepResult.heard ? `· oyó: «${deepResult.heard}»` : ""}
                  </div>
                  {deepResult.words && (
                    <div className="dict-ref" style={{ marginTop: 8 }}>
                      {deepResult.words.map((w, i) => (
                        <span key={i} className={`dict-word ${w.ok ? "good" : "bad"}`} title={w.tip || ""}>
                          {w.word}
                        </span>
                      ))}
                    </div>
                  )}
                  {deepResult.words && deepResult.words.some((w) => !w.ok) && (
                    <div className="dict-stats" style={{ marginTop: 8 }}>
                      {deepResult.words
                        .filter((w) => !w.ok)
                        .map((w, i) => (
                          <div key={i} className="errorfix-why" style={{ marginTop: 4 }}>
                            <b>{w.word}</b>: {w.tip || "pronúncialo con calma"}
                          </div>
                        ))}
                    </div>
                  )}
                  {deepResult.advice && (
                    <div className="errorfix-why" style={{ marginTop: 10 }}>
                      💡 {deepResult.advice}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      ) : mode === "video" ? (
        <>
          <div className="dict-story">
            <div className="dict-title">📹 Grábate diciendo una frase y mírate</div>
            <div className="suggest-sub">
              Prepara tu cámara, elige una frase (o la de tu nivel) y grábate hablando. Luego mírate: fíjate en tu boca y
              compárala con el modelo. Sirve para ver la forma de la boca al pronunciar.
            </div>
            <div className="dict-levels" style={{ margin: "10px 0" }}>
              {(["A1", "A2", "B1"] as Level[]).map((l) => (
                <button key={l} className={`chip-btn ${l === level ? "active" : ""}`} onClick={() => pickLevel(l)}>
                  {l}
                </button>
              ))}
            </div>
            {sentence && (
              <div className="errorfix-why" style={{ margin: "8px 0" }}>
                <b>{sentence.text}</b> — <span>{sentence.focus}</span>
              </div>
            )}
            <div className="dict-actions">
              <button className="chip-btn" onClick={() => speakReference(sentence?.text || "Hello, how are you?", 0.85)}>
                ▶ Escuchar modelo
              </button>
              <button className={`chip-btn primary ${vidRecording ? "active" : ""}`} onClick={vidRecording ? stopVideo : startVideo}>
                {vidRecording ? "■ Detener grabación" : "🎥 Grabar"}
              </button>
            </div>
          </div>
          <video
            ref={videoRef}
            className="vid-preview"
            autoPlay
            muted
            playsInline
            style={{ display: vidRecording || !vidUrl ? "block" : "none" }}
          />
          {!vidRecording && vidUrl && (
            <div className="dict-actions">
              <video src={vidUrl} controls className="vid-playback" style={{ maxWidth: "100%", borderRadius: 12 }} />
            </div>
          )}
          {vidError && <div className="exam-unlock bad">{vidError}</div>}
        </>
      ) : (
        <>
          {pair && (
            <div className="dict-story">
              <div className="dict-title">
                {pairTarget === "a" ? pair.a : pair.b}{" "}
                <span className="lvl-badge" style={{ marginLeft: 8 }}>
                  objetivo
                </span>
              </div>
              <div className="suggest-sub">
                El sistema pronunciará una de las dos palabras. Repítela. Debe reconocer <b>{pairTarget === "a" ? pair.a : pair.b}</b> y no su par.
              </div>
              <div className="dict-pair-box">
                <span className="dict-pair-word">{pair.a}</span>
                <span className="dict-pair-vs">vs</span>
                <span className="dict-pair-word">{pair.b}</span>
              </div>
              <div className="errorfix-why">{pair.note}</div>
              <div className="dict-actions">
                <button className="chip-btn" onClick={() => speakReference(pairTarget === "a" ? pair.a : pair.b, 0.85)}>
                  ▶ Escuchar
                </button>
                <button
                  className={`chip-btn primary ${listening ? "active" : ""}`}
                  onClick={() => record(pairTarget)}
                  disabled={!sttSupported}
                >
                  {listening ? "● Escuchando…" : "🎙 Dila"}
                </button>
                {active && (
                  <button className="chip-btn" onClick={() => stopRec()}>
                    ■ Detener
                  </button>
                )}
                <button className="chip-btn" onClick={() => speakReference(`I said ${pairTarget === "a" ? pair.a : pair.b}.`, 0.9)}>
                  🔊 Modelo: «I said {pairTarget === "a" ? pair.a : pair.b}»
                </button>
              </div>
            </div>
          )}
          <textarea
            className="dict-input"
            value={heard}
            onChange={(e) => setHeard(e.target.value)}
            placeholder="Lo que el sistema reconoció…"
            rows={2}
          />
          <div className="dict-actions">
            <button className="start-btn" onClick={gradePair} disabled={!heard.trim()}>
              Comprobar →
            </button>
            <button className="chip-btn" onClick={nextPair}>
              Otro par
            </button>
          </div>
          {pairResult && pair && (
            <div className={`dict-result ${pairResult === "hit" ? "good" : "bad"}`}>
              <div className="dict-score">
                {pairResult === "hit"
                  ? `✓ ¡Bien! El sistema reconoció «${pairTarget === "a" ? pair.a : pair.b}».`
                  : `✗ No entendió «${pairTarget === "a" ? pair.a : pair.b}». Escucha el modelo y vuelve a intentarlo.`}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}