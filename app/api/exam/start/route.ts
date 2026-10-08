import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,status,expires_at").eq("token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "disqualified") return NextResponse.json({ error: "Disqualified", status: invite.status }, { status: 403 });
  if (invite.status === "submitted") return NextResponse.json({ error: "Already submitted", status: invite.status }, { status: 403 });
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });
  if (invite.status === "invited") {
    await sb.from("exam_invites").update({ status: "started", started_at: new Date().toISOString() }).eq("id", invite.id);
  }
  return NextResponse.json({ ok: true });
}
