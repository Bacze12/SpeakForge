import { describe, expect, it } from "vitest";
import {
  emptyState,
  speedVerdict,
  updateSpeedBaseline,
  defaultSpeed,
  type TutorState,
} from "../learner";
import { lessonStatus } from "../course";
import { createSessionToken, hashPassword, isValidEmail, readSessionToken, verifyPassword } from "../auth";

describe("speedVerdict", () => {
  const ema = { mu: 5000, sd: 1000, n: 10 };
  it("recolecta cuando no hay datos suficientes", () => {
    expect(speedVerdict(undefined, 3000)).toBe("collect");
    expect(speedVerdict({ mu: 5000, sd: 1000, n: 4 }, 3000)).toBe("collect");
  });
  it("clasifica rápido/normal/lento por z-score", () => {
    expect(speedVerdict(ema, 4000)).toBe("fast"); // z = -1
    expect(speedVerdict(ema, 5200)).toBe("normal"); // z = 0.2
    expect(speedVerdict(ema, 7000)).toBe("slow"); // z = 2
  });
});

describe("updateSpeedBaseline", () => {
  it("acumula media y desviación de forma estable", () => {
    let s: TutorState = { ...emptyState(), speed: defaultSpeed() };
    for (const ms of [5000, 5000, 5000, 5000, 6000, 4000]) {
      s = updateSpeedBaseline(s, "voice", ms);
    }
    const v = s.speed!.voice;
    expect(v.n).toBe(6);
    expect(v.mu).toBeGreaterThan(4000);
    expect(v.mu).toBeLessThan(6000);
    expect(v.sd).toBeGreaterThan(0);
  });
  it("mantiene modos separados (voz vs texto)", () => {
    let s: TutorState = { ...emptyState(), speed: defaultSpeed() };
    s = updateSpeedBaseline(s, "voice", 3000);
    s = updateSpeedBaseline(s, "text", 12000);
    expect(s.speed!.voice.mu).toBeLessThan(s.speed!.text.mu);
    expect(s.speed!.text.n).toBe(1);
  });
  it("limita valores extremos", () => {
    let s: TutorState = { ...emptyState(), speed: defaultSpeed() };
    s = updateSpeedBaseline(s, "text", 999999999);
    expect(s.speed!.text.mu).toBeLessThanOrEqual(120000);
    s = updateSpeedBaseline(s, "text", 1);
    expect(s.speed!.text.mu).toBeGreaterThanOrEqual(300);
  });
});

describe("lessonStatus", () => {
  it("done si está completada explícitamente o dominio ≥0.8 en todos", () => {
    expect(lessonStatus("A1", "A2", true, [0.1])).toBe("done");
    expect(lessonStatus("A1", "C2", false, [0.85, 0.8])).toBe("done");
  });
  it("optional para niveles anteriores al del usuario sin dominar", () => {
    expect(lessonStatus("A1", "B1", false, [0.3])).toBe("optional");
    expect(lessonStatus("A2", "A2", false, [0.3])).toBe("pending");
  });
  it("pending en el nivel actual o superior", () => {
    expect(lessonStatus("B1", "A2", false, [0.9])).not.toBe("optional");
    expect(lessonStatus("B2", "B2", false, [0.5])).toBe("pending");
  });
});

describe("auth (partes puras)", () => {
  it("hash + verify de contraseña", async () => {
    const hash = await hashPassword("secreto123");
    expect(await verifyPassword("secreto123", hash)).toBe(true);
    expect(await verifyPassword("otra", hash)).toBe(false);
  });
  it("token de sesión roundtrip", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-test-secret-test-secret-1234567890";
    const token = await createSessionToken({ id: "u1", email: "a@b.com", name: "Ana" });
    const user = await readSessionToken(token);
    expect(user?.id).toBe("u1");
    expect(user?.email).toBe("a@b.com");
    expect(await readSessionToken("token-basura")).toBeNull();
  });
  it("valida emails", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
  });
});
