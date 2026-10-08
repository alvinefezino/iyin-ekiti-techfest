import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token, reason } = await req.json().catch(() => ({} as any));
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,status").eq("token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "submitted" || invite.status === "disqualified") return NextResponse.json({ ok: true, status: invite.status });
  await sb.from("exam_invites").update({ status: "disqualified", disqualified_reason: reason ?? "violation", submitted_at: new Date().toISOString() }).eq("id", invite.id);
  return NextResponse.json({ ok: true });
}
