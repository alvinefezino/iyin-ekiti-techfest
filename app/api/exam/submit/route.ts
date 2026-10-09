import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { EXAM_QUESTIONS } from "@/lib/examQuestions";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { token?: string; answers?: Record<string, number>; violationReason?: string }
    | null;
  if (!body?.token || !body.answers) return NextResponse.json({ error: "token and answers required" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,status").eq("token", body.token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "disqualified") return NextResponse.json({ error: "Disqualified" }, { status: 403 });
  if (invite.status === "submitted") return NextResponse.json({ error: "Already submitted" }, { status: 403 });

  const { data: dbQs } = await sb.from("exam_questions").select("id,answer").order("id");
  const key: Record<number, number> = {};
  if (dbQs && dbQs.length === 50) dbQs.forEach((q: any) => (key[q.id] = q.answer));
  else EXAM_QUESTIONS.forEach((q) => (key[q.id] = q.answer));

  let score = 0;
  for (const [k, v] of Object.entries(body.answers)) {
    const id = Number(k);
    if (key[id] === v) score += 1;
  }

  const violationReason = typeof body.violationReason === "string" ? body.violationReason.slice(0, 64) : null;
  const payload: Record<string, unknown> = {
    status: "submitted",
    answers: body.answers,
    score,
    submitted_at: new Date().toISOString(),
  };
  if (violationReason) payload["disqualified_reason"] = violationReason;

  await sb.from("exam_invites").update(payload).eq("id", invite.id);
  return NextResponse.json({ ok: true, score, total: 50 });
}
