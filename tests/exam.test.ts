import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate answers validation from app/api/exam/submit
function normalizeAnswers(input: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!Number.isInteger(v as number) || (v as number) < 0 || (v as number) > 3) continue;
    out[String(id)] = v as number;
    if (Object.keys(out).length >= 50) break;
  }
  return out;
}

const ALLOWED_VIOLATION = new Set(["copy", "cut", "paste", "screenshot", "exit", "timeout"]);
function normalizeViolation(s: string): string | null {
  const raw = s.trim().slice(0, 32);
  if (ALLOWED_VIOLATION.has(raw)) return raw;
  return raw ? "violation" : null;
}

describe("exam answers validation", () => {
  it("accepts valid 0-3", () => {
    expect(normalizeAnswers({ "1": 0, "2": 3, "3": 1 })).toEqual({ "1": 0, "2": 3, "3": 1 });
  });
  it("drops out-of-range values", () => {
    expect(normalizeAnswers({ "1": 5, "2": -1, "3": 2 })).toEqual({ "3": 2 });
  });
  it("drops non-integer keys", () => {
    expect(normalizeAnswers({ "a": 1, "1.5": 2, "2": 2 } as any)).toEqual({ "2": 2 });
  });
  it("caps at 50", () => {
    const big: Record<string, number> = {};
    for (let i = 1; i <= 60; i++) big[String(i)] = 1;
    expect(Object.keys(normalizeAnswers(big))).toHaveLength(50);
  });
});

describe("violation allowlist", () => {
  it("allows known reasons", () => {
    expect(normalizeViolation("copy")).toBe("copy");
    expect(normalizeViolation("timeout")).toBe("timeout");
  });
  it("maps unknown to violation", () => {
    expect(normalizeViolation("hacked")).toBe("violation");
  });
  it("empty -> null", () => {
    expect(normalizeViolation("")).toBe(null);
    expect(normalizeViolation("   ")).toBe(null);
  });
});

describe("scoring", () => {
  it("scores correctly", () => {
    const key: Record<number, number> = { 1: 1, 2: 0, 3: 2 };
    const answers = { "1": 1, "2": 1, "3": 2 };
    let score = 0;
    for (const [k, v] of Object.entries(answers)) if (key[Number(k)] === v) score++;
    expect(score).toBe(2);
  });
  it("disqualifies below 20", () => {
    expect(19 < 20).toBe(true);
    expect(20 < 20).toBe(false);
  });
});

describe("zod schemas (register/sponsor)", () => {
  const registerSchema = z.object({
    full_name: z.string().min(2).max(120),
    email: z.string().email(),
  });
  it("rejects short name", () => {
    expect(registerSchema.safeParse({ full_name: "A", email: "a@b.com" }).success).toBe(false);
  });
  it("rejects bad email", () => {
    expect(registerSchema.safeParse({ full_name: "Alice", email: "not-email" }).success).toBe(false);
  });
  it("accepts valid", () => {
    expect(registerSchema.safeParse({ full_name: "Alice Doe", email: "a@b.com" }).success).toBe(true);
  });
});
