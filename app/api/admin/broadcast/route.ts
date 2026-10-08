import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";
import { shell } from "@/lib/email";
import { SITE } from "@/lib/site";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subject, body } = await req.json();
  if (!subject || !body) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });

  const sb = supabaseAdmin();
  const { data: subs } = await sb.from("subscribers").select("email,token").is("unsubscribed_at", null);
  const list = subs ?? [];
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
  const html = (token: string) => shell(`<div style="white-space:pre-line">${esc(String(body))}</div><p style="font-size:12px;margin-top:20px"><a style="color:#F57F17" href="${SITE.url}">Visit the site</a> · <a style="color:#F57F17" href="${SITE.url}/api/unsubscribe?token=${token}">Unsubscribe</a></p>`);
  const from = process.env.EMAIL_FROM || "Iyin-Ekiti TechFest <onboarding@resend.dev>";

  let sent = 0;
  let lastError: string | null = null;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map((s) => ({ from, to: s.email, subject: String(subject), html: html(s.token) }));
    const res = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(chunk) });
    if (res.ok) sent += chunk.length;
    else {
      const txt = await res.text().catch(() => res.statusText);
      lastError = txt;
      console.error("[broadcast] Resend batch failed", res.status, txt);
    }
  }
  await sb.from("broadcasts").insert({ subject: String(subject), body: String(body), sent_at: new Date().toISOString() });
  if (sent === 0 && lastError) return NextResponse.json({ ok: false, sent, total: list.length, error: lastError }, { status: 502 });
  return NextResponse.json({ ok: true, sent, total: list.length, error: lastError });
}
