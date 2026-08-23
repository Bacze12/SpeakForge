"use client";

import { useState } from "react";
import { GOALS, INTERESTS, SITUATION_OPTIONS } from "@/lib/knowledge";
import type { Profile } from "@/lib/learner";

export default function Onboarding({
  onDone,
  onSkip,
}: {
  onDone: (profile: Profile) => void;
  onSkip: () => void;
}) {
  const [native, setNative] = useState("Español");
  const [goals, setGoals] = useState<string[]>(["conversation"]);
  const [profession, setProfession] = useState("");
  const [interests, setInterests] = useState<string[]>(["technology"]);
  const [situations, setSituations] = useState<string[]>(["interview", "casual_talk"]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="onb-overlay">
      <div className="onb-card">
        <h2>👋 Antes de empezar, conozcámonos</h2>
        <p className="onb-sub">
          Esto sirve para que tu tutor use los contextos que te interesan. No limita lo que aprenderás.
        </p>

        <label className="onb-label">Idioma nativo</label>
        <select className="onb-input" value={native} onChange={(e) => setNative(e.target.value)}>
          {["Español", "Portugués", "Francés", "Alemán", "Italiano", "Otro"].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>

        <label className="onb-label">Objetivos (elige varios)</label>
        <div className="onb-chips">
          {GOALS.map((g) => (
            <button
              key={g.id}
              className={`onb-chip ${goals.includes(g.id) ? "on" : ""}`}
              onClick={() => toggle(goals, setGoals, g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <label className="onb-label">Profesión (opcional)</label>
        <input
          className="onb-input"
          placeholder="Ej: software engineer, chef, estudiante…"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
        />

        <label className="onb-label">Intereses (elige varios)</label>
        <div className="onb-chips">
          {INTERESTS.map((g) => (
            <button
              key={g.id}
              className={`onb-chip ${interests.includes(g.id) ? "on" : ""}`}
              onClick={() => toggle(interests, setInterests, g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <label className="onb-label">Situaciones que quieres practicar (elige varias)</label>
        <div className="onb-chips">
          {SITUATION_OPTIONS.map((g) => (
            <button
              key={g.id}
              className={`onb-chip ${situations.includes(g.id) ? "on" : ""}`}
              onClick={() => toggle(situations, setSituations, g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="onb-actions">
          <button className="chip-btn" onClick={onSkip}>
            Saltar por ahora
          </button>
          <button
            className="start-btn"
            onClick={() =>
              onDone({
                native,
                target: "English",
                goals,
                profession: profession.trim(),
                interests,
                situations,
              })
            }
          >
            Listo →
          </button>
        </div>
      </div>
    </div>
  );
}