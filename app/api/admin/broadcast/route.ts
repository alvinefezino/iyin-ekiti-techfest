import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, shell } from "@/lib/email";
import { SITE } from "@/lib/site";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subject, body, audience } = await req.json();
  if (!subject || !body) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });

  const sb = supabaseAdmin();
  let raw: { email: string; token?: string }[] = [];
  if (audience === "contestants") {
    const { data } = await sb.from("hackathon_registrations").select("email");
    raw = ((data ?? []) as any[]).map((r: any) => ({ email: r.email }));
  } else {
    const { data } = await sb.from("subscribers").select("email,token").is("unsubscribed_at", null);
    raw = (data ?? []) as { email: string; token?: string }[];
  }

  const isBlockedDomain = (e: string) => /@(example\.com|test\.com|example\.org)$/i.test(e);
  const seen = new Set<string>();
  const filtered = raw.filter((s) => {
    const e = s.email.toLowerCase();
    if (isBlockedDomain(e) || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
  const skipped = raw.length - filtered.length;
  const list = filtered;

  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
  const html = (token?: string) =>
    shell(
      `<div style="white-space:pre-line">${esc(String(body))}</div>` +
        `<p style="font-size:12px;margin-top:20px"><a style="color:#F57F17" href="${SITE.url}">Visit the site</a>` +
        (token ? ` \u00B7 <a style="color:#F57F17" href="${SITE.url}/api/unsubscribe?token=${token}">Unsubscribe</a>` : "") +
        `</p>`
    );

  let sent = 0;
  let lastError: string | null = null;
  const CONCURRENCY = 5;
  // SendByte: stable per-broadcast idempotency — same batchId retries dedup, new broadcast gets new batchId
  const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ik = (email: string) => `broadcast:${String(subject).slice(0, 40)}:${email.toLowerCase()}:${batchId}`;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const chunk = list.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((s) => sendEmail(s.email, String(subject), html(s.token), { idempotencyKey: ik(s.email) }))
    );
    for (const r of results) {
      if (r.ok) sent += 1;
      else lastError = r.error ?? "send failed";
    }
  }

  await sb.from("broadcasts").insert({ subject: String(subject), body: String(body), sent_at: new Date().toISOString() });
  if (lastError && lastError.includes("example.com")) lastError += " \u2014 SMTP rejected the address (often onboarding@resend.dev in dev). Set EMAIL_FROM to your real sender like noreply@iyinekititechfest.com and use GMAIL_USER+GMAIL_APP_PASSWORD or SMTP_HOST.";
  const skippedNote = skipped ? ` Skipped ${skipped} test/duplicate address(es).` : "";
  if (sent === 0 && lastError) return NextResponse.json({ ok: false, sent, total: list.length, skipped, error: lastError + skippedNote }, { status: 502 });
  if (skipped) lastError = (lastError ? lastError + skippedNote : skippedNote.trim());
  return NextResponse.json({ ok: true, sent, total: list.length, skipped, error: lastError });
}
