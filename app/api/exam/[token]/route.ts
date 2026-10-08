import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { EXAM_QUESTIONS } from "@/lib/examQuestions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,email,status,expires_at,score,disqualified_reason").eq("token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Link expired", invite }, { status: 410 });
  const publicQs = EXAM_QUESTIONS.map(({ answer, ...q }) => q);
  // also try DB
  const { data: dbQs } = await sb.from("exam_questions").select("id,question,options").order("id");
  const questions = dbQs && dbQs.length === 50 ? dbQs.map((q: any) => ({ id: q.id, question: q.question, options: q.options })) : publicQs;
  return NextResponse.json({ invite, questions });
}
