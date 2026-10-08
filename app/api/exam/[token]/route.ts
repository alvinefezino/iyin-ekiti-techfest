import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { EXAM_QUESTIONS } from "@/lib/examQuestions";

function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t2 = Math.imul(s ^ (s >>> 15), 1 | s); t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2); return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,email,status,expires_at,score,disqualified_reason").eq("token", token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Link expired", invite }, { status: 410 });
  const publicQs = EXAM_QUESTIONS.map(({ answer, ...q }) => q);
  // also try DB
  const { data: dbQs } = await sb.from("exam_questions").select("id,question,options").order("id");
  const base = dbQs && dbQs.length === 50 ? dbQs.map((q: any) => ({ id: q.id, question: q.question, options: q.options })) : publicQs;
  const questions = seededShuffle(base, token);
  return NextResponse.json({ invite, questions });
}
