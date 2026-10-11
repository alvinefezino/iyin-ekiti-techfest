import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, shell } from "@/lib/email";
import { SITE } from "@/lib/site";

function displayNameFromEmail(email: string): string {
  const local = String(email).split("@")[0] || "";
  // gmail often uses dots: john.doe123 -> John
  const first = local.split(/[._\-+]/)[0].replace(/\d+/g, "") || local.replace(/\d+/g, "") || "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function resolveName(email: string, fullName?: string | null): string {
  const fn = String(fullName || "").trim();
  if (fn) return fn.split(/\s+/)[0].replace(/[^A-Za-z\-']/g, "") || displayNameFromEmail(email);
  return displayNameFromEmail(email);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { subject, body, audience } = await req.json();
  if (!subject || !body) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });

  const sb = supabaseAdmin();
  type Rec = { email: string; token?: string; full_name?: string | null };
  let raw: Rec[] = [];
  if (audience === "contestants") {
    const { data } = await sb.from("hackathon_registrations").select("email,full_name");
    raw = ((data ?? []) as any[]).map((r: any) => ({ email: r.email, full_name: r.full_name ?? null }));
  } else {
    const { data } = await sb.from("subscribers").select("email,token").is("unsubscribed_at", null);
    raw = ((data ?? []) as any[]).map((r: any) => ({ email: r.email, token: r.token, full_name: null }));
    // Try to enrich subscriber names from registrations where emails overlap (gmail name reuse)
    try {
      const emails = raw.map((r) => r.email.toLowerCase());
      const { data: regs } = await sb.from("hackathon_registrations").select("email,full_name").in("email", raw.map((r) => r.email));
      const map = new Map<string, string>();
      (regs ?? []).forEach((r: any) => map.set(String(r.email).toLowerCase(), String(r.full_name || "")));
      raw = raw.map((r) => ({ ...r, full_name: map.get(r.email.toLowerCase()) ?? null }));
    } catch {}
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

  // Body templating: support {{name}}, {{firstName}}, {{first_name}}, {{fullName}} placeholders
  function renderBody(rawBody: string, name: string, fullName: string): string {
    let out = String(rawBody);
    const first = name;
    out = out.replace(/\{\{\s*name\s*\}\}/gi, esc(first));
    out = out.replace(/\{\{\s*firstName\s*\}\}/gi, esc(first));
    out = out.replace(/\{\{\s*first[_\- ]?name\s*\}\}/gi, esc(first));
    out = out.replace(/\{\{\s*fullName\s*\}\}/gi, esc(fullName));
    out = out.replace(/\{\{\s*full[_\- ]?name\s*\}\}/gi, esc(fullName));
    // never send literal "first name" / "contestant" placeholder - replace stray phrases
    out = out.replace(/\b(first name|contestant)\b/gi, esc(first));
    return out;
  }

  function hasGreeting(text: string): boolean {
    return /^\s*(hi|hello|dear|hey)\b/i.test(text.trim());
  }

  const htmlFor = (rec: Rec) => {
    const full = String(rec.full_name || "").trim() || displayNameFromEmail(rec.email);
    const first = resolveName(rec.email, rec.full_name);
    const bodyRendered = renderBody(String(body), first, full);
    const greeting = hasGreeting(bodyRendered) ? "" : `<p style="margin:0 0 12px">Hi ${esc(first)},</p>`;
    return shell(
      greeting + `<div style="white-space:pre-line">${esc(bodyRendered)}</div>` +
        `<p style="font-size:12px;margin-top:20px"><a style="color:#F57F17" href="${SITE.url}">Visit the site</a>` +
        (rec.token ? ` \u00B7 <a style="color:#F57F17" href="${SITE.url}/api/unsubscribe?token=${rec.token}">Unsubscribe</a>` : "") +
        `</p>`
    );
  };

  let sent = 0;
  let lastError: string | null = null;
  const CONCURRENCY = 5;
  const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ik = (email: string) => `broadcast:${String(subject).slice(0, 40)}:${email.toLowerCase()}:${batchId}`;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const chunk = list.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((s) => sendEmail(s.email, String(subject), htmlFor(s), { idempotencyKey: ik(s.email) }))
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
