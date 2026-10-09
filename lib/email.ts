import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SITE } from "@/lib/site";

const FROM =
  process.env.EMAIL_FROM ||
  (process.env.GMAIL_USER ? `Iyin Ekiti TechFest <${process.env.GMAIL_USER}>` : "Iyin Ekiti TechFest <noreply@iyinekititechfest.com>");

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || "";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;
  if (process.env.SMTP_HOST) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
    return _transporter;
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    _transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 3,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    return _transporter;
  }
  return null;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (res.ok) return { ok: true, error: null };
    const text = await res.text().catch(() => "");
    let msg = text;
    try { const j = JSON.parse(text); msg = (j as any).message || (j as any).error || text; } catch {}
    if (/domain.*not.*verified|403/i.test(msg)) {
      return { ok: false, error: `${msg} — verify iyinekititechfest.com in Resend (DNS) and use a verified FROM like noreply@iyinekititechfest.com.` };
    }
    return { ok: false, error: String(msg || `Resend ${res.status}`) };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  _opts?: { text?: string; idempotencyKey?: string },
) {
  const list = Array.isArray(to) ? to : [to];

  // Primary: Resend if key present
  if (RESEND_API_KEY) {
    let lastError: string | null = null;
    for (const rcpt of list) {
      const r = await sendViaResend(rcpt, subject, html);
      if (r.ok) continue;
      // Fallback to SMTP/Gmail for transient or domain issues when transporter is configured
      const t = getTransporter();
      const shouldFallback = t && /domain_not_verified|451|429|rate_limit|temporary|535/i.test(String(r.error));
      if (shouldFallback && t) {
        try {
          await t.sendMail({ from: FROM, to: rcpt, subject, html });
          continue;
        } catch (e: unknown) {
          lastError = e instanceof Error ? e.message : String(e);
          continue;
        }
      }
      lastError = r.error;
    }
    if (lastError) return { ok: false as const, error: lastError };
    return { ok: true as const, error: null };
  }

  // Fallback: SMTP / Gmail
  const t = getTransporter();
  if (!t) {
    return {
      ok: false as const,
      error:
        "No mail transporter configured. Set RESEND_API_KEY (recommended, domain iyinekititechfest.com) or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or GMAIL_USER+GMAIL_APP_PASSWORD, and EMAIL_FROM=noreply@iyinekititechfest.com.",
    };
  }
  try {
    for (const rcpt of list) {
      await t.sendMail({ from: FROM, to: rcpt, subject, html });
    }
    return { ok: true as const, error: null };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export const shell = (inner: string) => `
<div style="background:#013216;padding:24px;font-family:Arial,sans-serif;color:#FFFFFF">
  <div style="max-width:520px;margin:auto;background:#013216;border:1px solid #F57F17;border-radius:16px;padding:24px">
    <h2 style="margin:0 0 12px;color:#F57F17">Iyin Ekiti TechFest</h2>
    ${inner}
    <p style="font-size:12px;color:#A0A0A0;margin-top:24px">Iyin Ekiti TechFest powered by FIESU and FUTES Gotham Mafians</p>
  </div>
</div>`;
