import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { limited, getClientIp } from "@/lib/rate";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (await limited(`exam:start:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { token } = await req.json().catch(() => ({}));
  if (!token || !/^[0-9a-f-]{36}$/i.test(String(token))) return NextResponse.json({ error: "token required" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,status,expires_at,started_at").eq("token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "disqualified") return NextResponse.json({ error: "Disqualified", status: invite.status }, { status: 403 });
  if (invite.status === "submitted") return NextResponse.json({ error: "Already submitted", status: invite.status }, { status: 403 });
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });
  // Enforce single exam window: if already started, check 20-min window hasn't lapsed server-side
  if (invite.status === "started" && invite.started_at) {
    const elapsed = Date.now() - new Date(invite.started_at as string).getTime();
    if (elapsed > 20 * 60 * 1000 + 60_000) {
      return NextResponse.json({ error: "Exam window expired" }, { status: 410 });
    }
    return NextResponse.json({ ok: true });
  }
  if (invite.status === "invited") {
    await sb.from("exam_invites").update({ status: "started", started_at: new Date().toISOString() }).eq("id", invite.id).eq("status", "invited");
  }
  return NextResponse.json({ ok: true });
}