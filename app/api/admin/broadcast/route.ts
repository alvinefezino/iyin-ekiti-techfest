import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";
import { shell } from "@/lib/email";
import { sendMail } from "@/lib/mailer";
import { SITE } from "@/lib/site";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subject, body, audience } = await req.json();
  if (!subject || !body) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
    return NextResponse.json({ error: "GMAIL_USER or GMAIL_APP_PASSWORD missing" }, { status: 500 });

  const sb = supabaseAdmin();
  let raw: { email: string; token?: string }[] = [];
  if (audience === "contestants") {
    const { data } = await sb.from("hackathon_registrations").select("email");
    raw = data ?? [];
  } else {
    const { data } = await sb.from("subscribers").select("email,token").is("unsubscribed_at", null);
    raw = data ?? [];
  }

  const isBlockedDomain = (e: string) => /@(example\.com|test\.com|example\.org)$/i.test(e);
  const seen = new Set<string>();
  const list = raw.filter((s) => {
    const e = s.email.toLowerCase();
    if (isBlockedDomain(e) || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
  const skipped = raw.length - list.length;

  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
  const html = (token?: string) =>
    shell(
      `<div style="white-space:pre-line">${esc(String(body))}</div>` +
        `<p style="font-size:12px;margin-top:20px"><a style="color:#F57F17" href="${SITE.url}">Visit the site</a>` +
        (token ? ` · <a style="color:#F57F17" href="${SITE.url}/api/unsubscribe?token=${token}">Unsubscribe</a>` : "") +
        `</p>`
    );

  const results = await Promise.allSettled(list.map((s) => sendMail(s.email, String(subject), html(s.token))));
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  const lastError = failed ? String(failed.reason?.message ?? failed.reason) : null;
  if (failed) console.error("[broadcast] nodemailer failed", lastError);

  await sb.from("broadcasts").insert({ subject: String(subject), body: String(body), sent_at: new Date().toISOString() });
  if (sent === 0 && lastError)
    return NextResponse.json({ ok: false, sent, total: list.length, skipped, error: lastError }, { status: 502 });
  return NextResponse.json({ ok: true, sent, total: list.length, skipped, error: lastError });
}
