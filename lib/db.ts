import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) {
      throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN no configurados");
    }
    client = createClient({ url, authToken: token });
  }
  return client;
}

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getDb();
      await db.batch(
        [
          // Cuentas y dispositivos
          `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL DEFAULT '',
            current_level TEXT NOT NULL DEFAULT 'A2',
            xp INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          )`,
          `CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            user_id TEXT,
            label TEXT NOT NULL DEFAULT '',
            first_seen_at INTEGER NOT NULL,
            last_seen_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)`,

          // Estado del aprendiz (snapshot completo para respaldo/restauración)
          `CREATE TABLE IF NOT EXISTS learner_state (
            device_id TEXT PRIMARY KEY,
            user_id TEXT,
            level TEXT NOT NULL DEFAULT 'A2',
            xp INTEGER NOT NULL DEFAULT 0,
            streak_days INTEGER NOT NULL DEFAULT 0,
            state_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )`,

          // Cada intento de producción del usuario
          `CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            concept_id TEXT NOT NULL,
            success INTEGER NOT NULL,
            help_used INTEGER NOT NULL DEFAULT 0,
            context TEXT NOT NULL DEFAULT '',
            wrong TEXT NOT NULL DEFAULT '',
            correct TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_attempts_device_time ON attempts(device_id, created_at)`,
          `CREATE INDEX IF NOT EXISTS idx_attempts_concept ON attempts(concept_id)`,

          // Errores detectados (alimenta My Notebook)
          `CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            error_type TEXT NOT NULL,
            wrong TEXT NOT NULL,
            correct TEXT NOT NULL DEFAULT '',
            context TEXT NOT NULL DEFAULT '',
            fixed_at INTEGER,
            created_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_errors_device ON errors(device_id, fixed_at)`,

          // Repetición espaciada server-side
          `CREATE TABLE IF NOT EXISTS review_schedule (
            device_id TEXT NOT NULL,
            concept_id TEXT NOT NULL,
            due_at INTEGER NOT NULL,
            interval_days REAL NOT NULL DEFAULT 0,
            ease REAL NOT NULL DEFAULT 2.5,
            reps INTEGER NOT NULL DEFAULT 0,
            lapses INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (device_id, concept_id)
          )`,
          `CREATE INDEX IF NOT EXISTS idx_reviews_due ON review_schedule(device_id, due_at)`,

          // Lecciones completadas (Course Graph)
          `CREATE TABLE IF NOT EXISTS lesson_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            lesson_id TEXT NOT NULL,
            stats_json TEXT NOT NULL DEFAULT '{}',
            completed_at INTEGER NOT NULL,
            UNIQUE (device_id, lesson_id)
          )`,
          `CREATE INDEX IF NOT EXISTS idx_lessons_device ON lesson_completions(device_id, completed_at)`,

          // Exámenes de certificación
          `CREATE TABLE IF NOT EXISTS exam_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            level TEXT NOT NULL,
            passed INTEGER NOT NULL,
            score_json TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_exams_device ON exam_results(device_id, created_at)`,

          // My Notebook
          `CREATE TABLE IF NOT EXISTS notebook_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            text_en TEXT NOT NULL,
            note_es TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '',
            source_concept TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_notebook_device ON notebook_entries(device_id, created_at)`,

          // Costos de IA (Fase 3)
          `CREATE TABLE IF NOT EXISTS ai_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT '',
            tokens_in INTEGER NOT NULL DEFAULT 0,
            tokens_out INTEGER NOT NULL DEFAULT 0,
            cost_usd REAL NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage(created_at)`,
          `CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage(provider, model)`,

          // Auditoría
          `CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            action TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )`,
        ],
        "write"
      );
      await migrateLearnerState(db);
    })();
  }
  return schemaPromise;
}

// Migración: learner_state creado antes de users necesita columna user_id.
async function migrateLearnerState(db: Client): Promise<void> {
  const cols = await db.execute(`PRAGMA table_info(learner_state)`);
  const names = new Set(cols.rows.map((r) => String(r.name)));
  if (!names.has("user_id")) {
    await db.execute(`ALTER TABLE learner_state ADD COLUMN user_id TEXT`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_learner_state_user ON learner_state(user_id)`);
  }
}

export async function upsertLearnerState(
  deviceId: string,
  state: unknown,
  meta: { level?: string; xp?: number; streakDays?: number; userId?: string } = {}
): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const level = meta.level ?? "A2";
  const xp = meta.xp ?? 0;
  const streakDays = meta.streakDays ?? 0;
  const now = Date.now();
  await db.batch(
    [
      {
        sql: `INSERT INTO devices (device_id, user_id, label, first_seen_at, last_seen_at)
              VALUES (?, ?, '', ?, ?)
              ON CONFLICT(device_id) DO UPDATE SET
                user_id = COALESCE(excluded.user_id, devices.user_id),
                last_seen_at = excluded.last_seen_at`,
        args: [deviceId, meta.userId ?? null, now, now],
      },
      {
        sql: `INSERT INTO learner_state (device_id, user_id, level, xp, streak_days, state_json, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(device_id) DO UPDATE SET
                user_id = COALESCE(excluded.user_id, learner_state.user_id),
                level = excluded.level,
                xp = excluded.xp,
                streak_days = excluded.streak_days,
                state_json = excluded.state_json,
                updated_at = excluded.updated_at`,
        args: [deviceId, meta.userId ?? null, level, xp, streakDays, JSON.stringify(state), now],
      },
      {
        sql: `INSERT INTO sync_log (device_id, action, created_at) VALUES (?, 'upsert', ?)`,
        args: [deviceId, now],
      },
    ],
    "write"
  );
}

export async function getLearnerState(deviceId: string): Promise<unknown | null> {
  await ensureSchema();
  const res = await getDb().execute({
    sql: `SELECT state_json FROM learner_state WHERE device_id = ?`,
    args: [deviceId],
  });
  if (!res.rows.length) return null;
  return JSON.parse(String(res.rows[0].state_json));
}

export async function pingDb(): Promise<{ ok: true; latencyMs: number }> {
  const t0 = Date.now();
  await getDb().execute("SELECT 1");
  return { ok: true, latencyMs: Date.now() - t0 };
}

export async function insertAttempt(
  deviceId: string,
  a: { conceptId: string; success: boolean; helpUsed?: number; context?: string; wrong?: string; correct?: string }
): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO attempts (device_id, concept_id, success, help_used, context, wrong, correct, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      deviceId,
      a.conceptId,
      a.success ? 1 : 0,
      a.helpUsed ?? 0,
      a.context || "",
      a.wrong || "",
      a.correct || "",
      Date.now(),
    ],
  });
}

export async function insertError(
  deviceId: string,
  e: { errorType: string; wrong: string; correct?: string; context?: string }
): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO errors (device_id, error_type, wrong, correct, context, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [deviceId, e.errorType, e.wrong, e.correct || "", e.context || "", Date.now()],
  });
}

// Estado más reciente de un usuario (cualquier dispositivo) para el merge al login.
export async function getLatestStateForUser(userId: string): Promise<{ state: unknown; updatedAt: number } | null> {
  await ensureSchema();
  const res = await getDb().execute({
    sql: `SELECT state_json, updated_at FROM learner_state WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
    args: [userId],
  });
  if (!res.rows.length) return null;
  return { state: JSON.parse(String(res.rows[0].state_json)), updatedAt: Number(res.rows[0].updated_at) };
}

/* ---- Usuarios ---- */

export type DbUser = { id: string; email: string; name: string; password_hash: string };

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  await ensureSchema();
  const res = await getDb().execute({
    sql: `SELECT id, email, name, password_hash FROM users WHERE email = ?`,
    args: [email.toLowerCase()],
  });
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return { id: String(r.id), email: String(r.email), name: String(r.name || ""), password_hash: String(r.password_hash) };
}

export async function createUser(u: { id: string; email: string; name: string; passwordHash: string }): Promise<void> {
  await ensureSchema();
  const now = Date.now();
  await getDb().execute({
    sql: `INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [u.id, u.email.toLowerCase(), u.name, u.passwordHash, now, now],
  });
}

export async function linkDevice(deviceId: string, userId: string): Promise<void> {
  await ensureSchema();
  const now = Date.now();
  await getDb().execute({
    sql: `INSERT INTO devices (device_id, user_id, label, first_seen_at, last_seen_at)
          VALUES (?, ?, '', ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET user_id = excluded.user_id, last_seen_at = excluded.last_seen_at`,
    args: [deviceId, userId, now, now],
  });
}
