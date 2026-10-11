import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { limited, getClientIp } from "@/lib/rate";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response(`<html><body style="background:#013216;color:#fff;font-family:Arial;display:grid;place-items:center;height:100vh"><p>Invalid link.</p></body></html>`, { headers: { "Content-Type": "text/html" } });
  }
  return new Response(
    `<html><head><meta charset="utf-8"/></head><body style="background:#013216;color:#FFFFFF;font-family:Arial;display:grid;place-items:center;min-height:100vh;margin:0"><form method="POST" action="/api/unsubscribe" style="text-align:center"><p>You are about to unsubscribe.</p><input type="hidden" name="token" value="${token}"/><button type="submit" style="background:#F57F17;color:#013216;border:none;padding:10px 18px;border-radius:999px;font-weight:700;cursor:pointer">Confirm unsubscribe</button></form></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (await limited(`unsub:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  let token = "";
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = await req.json().catch(() => ({} as any));
    token = String(j?.token || "").trim();
  } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    token = String(fd?.get("token") || "").trim();
  } else {
    const fd = await req.formData().catch(() => null);
    if (fd) token = String(fd.get("token") || "").trim();
    if (!token) {
      const j = await req.json().catch(() => ({} as any));
      token = String(j?.token || "").trim();
    }
  }
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response(`<html><body style="background:#013216;color:#fff;font-family:Arial;display:grid;place-items:center;height:100vh"><p>Invalid token.</p></body></html>`, { headers: { "Content-Type": "text/html" }, status: 400 });
  }
  await supabaseAdmin().from("subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("token", token);
  const acceptsJson = (req.headers.get("accept") || "").includes("application/json");
  if (acceptsJson) return NextResponse.json({ ok: true });
  return new Response(`<html><body style="background:#013216;color:#FFFFFF;font-family:Arial;display:grid;place-items:center;height:100vh"><p>You've been unsubscribed.</p></body></html>`, { headers: { "Content-Type": "text/html" } });
}
