"use client";

import { useState } from "react";
import { getDeviceId } from "@/lib/sync";

export default function AuthModal({
  onClose,
  onAuthed,
}: {
  onClose: () => void;
  onAuthed: (user: { id: string; email: string; name: string }) => void;
}) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, deviceId: getDeviceId() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(String(json.error || "algo salió mal"));
        return;
      }
      onAuthed(json.user);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-tabs">
          <button className={`chip-btn ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>
            Iniciar sesión
          </button>
          <button className={`chip-btn ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setError(""); }}>
            Crear cuenta
          </button>
        </div>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" autoFocus />
        </label>
        <label className="auth-field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={tab === "register" ? "mínimo 6 caracteres" : "••••••••"}
          />
        </label>
        {tab === "register" && (
          <label className="auth-field">
            <span>Nombre (opcional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo te llamas" />
          </label>
        )}
        {error && <div className="auth-error">⚠ {error}</div>}
        <button className="start-btn" onClick={submit} disabled={busy || !email || !password}>
          {busy ? "…" : tab === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        <p className="auth-note">
          Tu progreso se sincroniza con la nube y podrás recuperarlo en cualquier dispositivo.
        </p>
        <button className="chip-btn auth-close" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
