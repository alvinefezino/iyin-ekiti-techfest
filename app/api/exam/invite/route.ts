import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, requireAdmin } from "@/lib/supabase/server";
import { sendEmail, shell } from "@/lib/email";
import { SITE } from "@/lib/site";

const Body = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
  registrationIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const j = await req.json().catch(() => null);
  const p = Body.safeParse(j);
  if (!p.success) return NextResponse.json({ error: p.error.flatten() }, { status: 400 });

  const sb = supabaseAdmin();
  const results: { email: string; token?: string; error?: string }[] = [];

  for (const email of p.data.emails) {
    const { data: existing } = await sb.from("exam_invites").select("token,status").eq("email", email).in("status", ["invited","started"]).maybeSingle();
    let token: string;
    if (existing?.token) {
      token = existing.token;
    } else {
      const { data, error } = await sb.from("exam_invites").insert({ email, status: "invited", expires_at: new Date(Date.now()+ 7*24*60*60*1000).toISOString() }).select("token").single();
      if (error || !data) { results.push({ email, error: error?.message ?? "insert failed" }); continue; }
      token = data.token;
    }
    const link = `${SITE.url}/exam/${token}`;
    const previewLink = `${link}?preview=1`;
    const html = shell(`
      <div style="max-width:560px;margin:0 auto;font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0a0a0a;line-height:1.6">
        <div style="background:#013216;color:#FFFFFF;padding:20px 24px;border-radius:16px 16px 0 0;text-align:center">
          <div style="font-size:22px;font-weight:800;letter-spacing:0.02em">Congratulations!</div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px">You have been selected for the Iyin-Ekiti TechFest Hackathon by FIESU</div>
        </div>
        <div style="background:#FFFFFF;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 12px">Dear contestant,</p>
          <p style="margin:0 0 12px"><strong>Congratulations</strong> — you made it through screening and have been selected to compete in the <strong>Iyin-Ekiti TechFest Hackathon</strong> organised by <strong>FIESU</strong>.</p>
          <p style="margin:0 0 8px"><strong>About the test</strong></p>
          <p style="margin:0 0 12px;color:#333">A 50-question assessment, randomised per contestant. You have <strong>20 minutes</strong>, single attempt, timed — auto-submits at 00:00. Covers general tech and problem-solving. Final questions will be updated before the event; what you preview now is a dummy set in the same format.</p>
          <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:14px 16px;margin:16px 0">
            <div style="font-weight:700;color:#013216;margin-bottom:6px">Rules — read carefully</div>
            <ul style="margin:0;padding-left:18px;color:#333;font-size:14px">
              <li>Exam runs in <strong>fullscreen</strong>. Do not exit fullscreen, switch tabs, minimise, or close the window.</li>
              <li><strong>Blocked:</strong> copy, cut, paste, right-click, drag, PrintScreen / screenshot, and shortcuts Ctrl/Cmd + C / V / X / A / S / P, F12, Ctrl+Shift+I/J/C (DevTools).</li>
              <li><strong>One attempt only.</strong> Timer starts when you click Start Exam. Do not refresh mid-exam.</li>
            </ul>
          </div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:14px 16px;margin:0 0 16px">
            <div style="font-weight:700;color:#991B1B;margin-bottom:6px">Consequences</div>
            <p style="margin:0;color:#7F1D1D;font-size:14px">Any violation <strong>instantly disqualifies you</strong>. The terminal locks and shows <strong>You are disqualified</strong> with an X icon. No retake. Contact FIESU only if you believe this was a mistake.</p>
          </div>
          <div style="text-align:center;margin:20px 0 8px">
            <a href="${link}" style="display:inline-block;background:#F57F17;color:#000000;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Open Exam Terminal — Start (20 min)</a>
          </div>
          <div style="text-align:center;margin:0 0 14px">
            <a href="${previewLink}" style="display:inline-block;background:#013216;color:#FFFFFF;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;font-size:13px">Preview questions (no timer)</a>
          </div>
          <p style="font-size:12px;word-break:break-all;text-align:center;margin:8px 0 0"><a style="color:#F57F17" href="${link}">${link}</a></p>
          <p style="font-size:11px;color:#6B7280;text-align:center;margin:4px 0 0">Preview: <a style="color:#F57F17" href="${previewLink}">${previewLink}</a></p>
          <p style="font-size:12px;color:#6B7280;margin:16px 0 0">Link expires in 7 days and is tied to your email — do not share it. Use a laptop/desktop with stable internet. Good luck!</p>
          <p style="font-size:12px;color:#013216;margin:12px 0 0;font-weight:600">— FIESU / Iyin-Ekiti TechFest Team</p>
          <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0">Questions? Reply to this email or contact FIESU via the site.</p>
        </div>
      </div>
    `);
    const sent = await sendEmail(email, `Congratulations — Your FIESU Exam Terminal link (20 min, 50 questions)`, html);
    results.push(sent.ok ? { email, token } : { email, error: sent.error ?? "email failed" });
  }
  return NextResponse.json({ ok: true, results });
}
