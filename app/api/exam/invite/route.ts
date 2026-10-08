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
    // avoid duplicate active invite
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
    const html = shell(`<p>You have been selected for the Iyin-Ekiti TechFest hackathon.</p><p>Complete your assessment in the Exam Terminal:</p><p><a style="display:inline-block;background:#F57F17;color:#000000;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600" href="${link}">Open Exam Terminal</a></p><p style="font-size:12px;word-break:break-all;margin-top:12px"><a style="color:#F57F17" href="${link}">${link}</a></p><p style="font-size:12px;color:#A0A0A0;margin-top:16px">Do not share this link. Copy, paste, screenshots, or leaving the terminal will disqualify you.</p>`);
    const sent = await sendEmail(email, `Your ${SITE.name} Exam Terminal link`, html);
    results.push(sent.ok ? { email, token } : { email, error: sent.error ?? "email failed" });
  }

  return NextResponse.json({ ok: true, results });
}
