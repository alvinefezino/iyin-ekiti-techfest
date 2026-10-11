import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { EXAM_QUESTIONS } from "@/lib/examQuestions";
import { sendEmail, shell } from "@/lib/email";
import { limited, getClientIp } from "@/lib/rate";

const EXAM_DURATION_MS = 20 * 60 * 1000;
const GRACE_MS = 30 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (await limited(`exam:submit:${ip}`, 15, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as
    | { token?: string; answers?: Record<string, number>; violationReason?: string }
    | null;
  if (!body?.token || !body.answers) return NextResponse.json({ error: "token and answers required" }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(String(body.token))) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  // Strict answers shape: values must be 0-3, keys numeric, cap at 50
  const answers: Record<string, number> = {};
  for (const [k, v] of Object.entries(body.answers)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!Number.isInteger(v as number) || (v as number) < 0 || (v as number) > 3) continue;
    answers[String(id)] = v as number;
    if (Object.keys(answers).length >= 50) break;
  }
  const sb = supabaseAdmin();
  const { data: invite } = await sb.from("exam_invites").select("id,email,status,expires_at,started_at").eq("token", body.token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (invite.status === "disqualified") return NextResponse.json({ error: "Disqualified" }, { status: 403 });
  if (invite.status === "submitted") return NextResponse.json({ error: "Already submitted" }, { status: 403 });
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });
  if (invite.status !== "started" || !invite.started_at) {
    return NextResponse.json({ error: "Exam not started" }, { status: 409 });
  }
  const elapsed = Date.now() - new Date(invite.started_at as string).getTime();
  if (elapsed > EXAM_DURATION_MS + GRACE_MS) {
    return NextResponse.json({ error: "Exam window expired" }, { status: 410 });
  }

  const { data: dbQs } = await sb.from("exam_questions").select("id,answer").order("id");
  const key: Record<number, number> = {};
  if (dbQs && dbQs.length === 50) dbQs.forEach((q: any) => (key[q.id] = q.answer));
  else EXAM_QUESTIONS.forEach((q) => (key[q.id] = q.answer));

  let score = 0;
  for (const [k, v] of Object.entries(answers)) {
    const id = Number(k);
    if (key[id] === v) score += 1;
  }

  const ALLOWED_VIOLATION = new Set(["copy", "cut", "paste", "screenshot", "exit", "timeout"]);
  const rawViolation = typeof body.violationReason === "string" ? body.violationReason.trim().slice(0, 32) : "";
  const violationReason = ALLOWED_VIOLATION.has(rawViolation) ? rawViolation : rawViolation ? "violation" : null;

  const disqualifiedByScore = score < 20;
  const finalStatus = disqualifiedByScore ? "disqualified" : "submitted";
  const disqualifiedReason = violationReason ? violationReason : disqualifiedByScore ? "Score below required threshold" : null;

  const payload: Record<string, unknown> = {
    status: finalStatus,
    answers,
    score,
    submitted_at: new Date().toISOString(),
  };
  if (disqualifiedReason) payload["disqualified_reason"] = disqualifiedReason;

  const { error: updErr } = await sb.from("exam_invites").update(payload).eq("id", invite.id).eq("status", "started");
  if (updErr) return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  let displayName = "";
  try {
    const { data: reg } = await sb.from("hackathon_registrations").select("full_name").ilike("email", invite.email).maybeSingle();
    if (reg?.full_name) displayName = String(reg.full_name).trim().split(/\s+/)[0].replace(/[^A-Za-z\-']/g, "") || String(reg.full_name).trim().split(/\s+/)[0] || "";
  } catch {}
  if (!displayName) {
    const local = String(invite.email).split("@")[0] || "";
    const first = local.split(/[._\-+]/)[0].replace(/\d+/g, "") || local.replace(/\d+/g, "") || "there";
    displayName = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  try {
    if (disqualifiedByScore) {
      const html = shell(`
      <div style="max-width:560px;margin:0 auto;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0a0a0a;line-height:1.6">
        <div style="background:#013216;color:#FFFFFF;padding:20px 24px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:22px;font-weight:800;letter-spacing:0.02em">Update On Your Result</div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px">Iyin Ekiti TechFest Hackathon by FIESU</div>
        </div>
        <div style="background:#FFFFFF;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 12px">Hello ${displayName},</p>
          <p style="margin:0 0 12px">Thank you for taking part in the Iyin Ekiti TechFest assessment. We have reviewed your submission.</p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center">
            <div style="font-size:13px;color:#991B1B;font-weight:600">Your Score</div>
            <div style="font-size:28px;font-weight:800;color:#991B1B">${score} of 50</div>
            <div style="font-size:12px;color:#7F1D1D;margin-top:4px">Required to advance is 20 of 50</div>
          </div>
          <p style="margin:0 0 12px">We are sorry to let you know that you did not meet the requirements to move to the next stage at this time. This decision is based solely on the score threshold and is final for this round.</p>
          <p style="margin:0 0 12px">We truly value your interest and effort and we encourage you to stay connected for future opportunities with FIESU and Iyin Ekiti TechFest. Your passion for technology is appreciated and we hope to see you at upcoming events.</p>
          <p style="margin:16px 0 0;font-size:13px;color:#013216;font-weight:600">With appreciation</p>
          <p style="margin:2px 0 0;font-size:13px;color:#013216">FIESU and Iyin Ekiti TechFest Team</p>
          <p style="font-size:11px;color:#9CA3AF;margin:12px 0 0">Questions? Reply to this mail and our team will respond.</p>
        </div>
      </div>
    `);
      await sendEmail(invite.email, "Update On Your Iyin Ekiti TechFest Result", html);
    } else {
      const html = shell(`
      <div style="max-width:560px;margin:0 auto;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0a0a0a;line-height:1.65">
        <div style="background:#013216;color:#FFFFFF;padding:20px 24px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:19px;font-weight:800;line-height:1.3">Congratulations! You have Qualified for the Iyin Ekiti Tech Fest 2026 Hackathon Stage</div>
          <div style="font-size:13px;opacity:0.9;margin-top:6px">Iyin Ekiti TechFest Hackathon by FIESU</div>
        </div>
        <div style="background:#FFFFFF;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 12px">Hi ${displayName},</p>
          <p style="margin:0 0 12px;font-weight:700">Congratulations!</p>
          <p style="margin:0 0 12px">You have successfully passed the first stage of the Iyin Ekiti Tech Fest 2026 Hackathon, and we are pleased to inform you that you have qualified for the next stage!</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center">
            <div style="font-size:13px;color:#166534;font-weight:600">Your Score</div>
            <div style="font-size:28px;font-weight:800;color:#166534">${score} of 50</div>
          </div>
          <p style="margin:16px 0 0;font-size:13px;color:#013216;font-weight:600">With congratulations</p>
          <p style="margin:2px 0 0;font-size:13px;color:#013216">FIESU and Iyin Ekiti TechFest Team</p>
        </div>
      </div>
    `);
      await sendEmail(invite.email, "Congratulations! You have Qualified for the Iyin Ekiti Tech Fest 2026 Hackathon Stage", html);
    }
  } catch {}

  return NextResponse.json({ ok: true, score, total: 50, status: finalStatus });
}
