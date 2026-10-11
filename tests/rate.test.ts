import { describe, it, expect } from "vitest";
import { getClientIp, limited } from "@/lib/rate";

function reqWith(headers: Record<string,string>) {
  return new Request("http://localhost/api/test", { headers }) as unknown as Request;
}

describe("getClientIp", () => {
  it("returns first x-forwarded-for", () => {
    const r = reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIp(r)).toBe("1.1.1.1");
  });
  it("trims spaces", () => {
    const r = reqWith({ "x-forwarded-for": "  3.3.3.3  , 4.4.4.4" });
    expect(getClientIp(r)).toBe("3.3.3.3");
  });
  it("falls back to x-real-ip", () => {
    const r = reqWith({ "x-real-ip": "5.5.5.5" });
    expect(getClientIp(r)).toBe("5.5.5.5");
  });
  it("returns anon when no ip headers", () => {
    const r = reqWith({});
    expect(getClientIp(r)).toBe("anon");
  });
});

describe("limited (in-memory fallback)", () => {
  it("allows under limit and blocks over limit", async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    // max 3 per minute
    expect(await limited(key, 3, 60_000)).toBe(false);
    expect(await limited(key, 3, 60_000)).toBe(false);
    expect(await limited(key, 3, 60_000)).toBe(false);
    expect(await limited(key, 3, 60_000)).toBe(true); // 4th blocked
  });
  it("isolates keys", async () => {
    const a = `a:${Date.now()}:${Math.random()}`;
    const b = `b:${Date.now()}:${Math.random()}`;
    expect(await limited(a, 1, 60_000)).toBe(false);
    expect(await limited(a, 1, 60_000)).toBe(true);
    expect(await limited(b, 1, 60_000)).toBe(false);
  });
});
