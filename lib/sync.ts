import type { TutorState } from "./learner";

const DEVICE_KEY = "tutor_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function backupToCloud(
  state: TutorState,
  userId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        level: state.level,
        xp: state.xp,
        userId: userId || undefined,
        state,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) return { ok: false, error: String(json.error || res.status) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function looksLikeTutorState(v: unknown): v is TutorState {
  return (
    !!v &&
    typeof v === "object" &&
    "level" in v &&
    "skills" in v &&
    "concepts" in v &&
    "xp" in v
  );
}

export async function restoreFromCloud(): Promise<{
  ok: boolean;
  state?: TutorState;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/sync?deviceId=${encodeURIComponent(getDeviceId())}`);
    const json = await res.json();
    if (!res.ok || !json.ok) return { ok: false, error: String(json.error || res.status) };
    if (!json.state) return { ok: false, error: "no_backup" };
    if (!looksLikeTutorState(json.state)) return { ok: false, error: "formato inválido del respaldo" };
    return { ok: true, state: json.state };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Estado más reciente de la cuenta (cualquier dispositivo). Para el merge al login.
export async function restoreLatestForUser(
  userId: string
): Promise<{ ok: boolean; state?: TutorState; updatedAt?: number; error?: string }> {
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`);
    const json = await res.json();
    if (!res.ok || !json.ok) return { ok: false, error: String(json.error || res.status) };
    if (!json.state) return { ok: false, error: "no_backup" };
    if (!looksLikeTutorState(json.state)) return { ok: false, error: "formato inválido del respaldo" };
    return { ok: true, state: json.state, updatedAt: Number(json.updatedAt || 0) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Sesión actual (cookie httpOnly la lee el server).
export async function fetchMe(): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch("/api/auth/me");
    const json = await res.json();
    return json.user || null;
  } catch {
    return null;
  }
}
