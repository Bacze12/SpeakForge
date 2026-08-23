"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => setStatus(response.ok ? "authenticated" : "anonymous"))
      .catch(() => setStatus("anonymous"));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo completar la operación.");
        return;
      }
      setStatus("authenticated");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <main className="auth-loading">Cargando SpeakForge...</main>;
  if (status === "authenticated") return <>{children}</>;

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">SpeakForge</div>
        <p className="auth-kicker">Inglés funcional para TI</p>
        <h1>{register ? "Crea tu cuenta" : "Continúa tu entrenamiento"}</h1>
        <p className="auth-copy">Tu progreso, errores y cursos quedarán asociados a tu cuenta.</p>
        <form onSubmit={submit}>
          <label>
            Correo electrónico
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={register ? "new-password" : "current-password"} minLength={10} required />
          </label>
          {register && <small>Usa al menos 10 caracteres.</small>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="start-btn" type="submit" disabled={busy}>{busy ? "Procesando..." : register ? "Crear cuenta" : "Iniciar sesión"}</button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setRegister((value) => !value); setError(""); }}>
          {register ? "Ya tengo una cuenta" : "Crear una cuenta"}
        </button>
      </section>
    </main>
  );
}
