import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { limited, getClientIp } from "@/lib/rate";

const ALLOWED_REASONS = new Set(["copy", "cut", "paste", "screenshot", "exit", "violation"]);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (await limited(`exam:disqualify:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { token, reason } = await req.json().catch(() => ({} as any));
  if (!token || !/^[0-9a-f-]{36}$/i.test(String(token))) return NextResponse.json({ error: "token required" }, { status: 400 });
  const normalized = ALLOWED_REASONS.has(String(reason)) ? String(reason) : "violation";
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,status,expires_at").eq("token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "submitted" || invite.status === "disqualified") return NextResponse.json({ ok: true, status: invite.status });
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });
  await sb.from("exam_invites").update({ status: "disqualified", disqualified_reason: normalized, submitted_at: new Date().toISOString() }).eq("id", invite.id);
  return NextResponse.json({ ok: true });
}
