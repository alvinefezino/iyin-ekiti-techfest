import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SITE } from "@/lib/site";

const FROM =
  process.env.EMAIL_FROM ||
  (process.env.GMAIL_USER ? `Iyin-Ekiti TechFest <${process.env.GMAIL_USER}>` : "Iyin-Ekiti TechFest <noreply@iyinekititechfest.com>");

const SENDBYTE_API_KEY = process.env.SENDBYTE_API_KEY?.trim() || "";
const SENDBYTE_URL = "https://api.sendbyte.africa/v1/emails";

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

async function sendViaSendByte(
  to: string,
  subject: string,
  html: string,
  opts?: { text?: string; idempotencyKey?: string }
): Promise<{ ok: boolean; error: string | null }> {
  if (!SENDBYTE_API_KEY) return { ok: false, error: "SENDBYTE_API_KEY not set" };
  const body: Record<string, unknown> = {
    from: FROM,
    to: [to],
    subject,
    html,
    tags: ["iyintech"],
  };
  if (opts?.text) body.text = opts.text;
  if (opts?.idempotencyKey) body.idempotency_key = opts.idempotencyKey;
  try {
    const r = await fetch(SENDBYTE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDBYTE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 201 || r.status === 200) return { ok: true, error: null };
    const msg =
      (j as any)?.message ||
      (j as any)?.error ||
      ((j as any)?.errors ? JSON.stringify((j as any).errors) : "") ||
      `SendByte ${r.status}`;
    // Surface domain verification hint
    if (String(msg).toLowerCase().includes("domain_not_verified") || r.status === 403) {
      return { ok: false, error: `${msg} — verify iyinekititechfest.com in SendByte dashboard (3 DNS records) and use sk_live_ key, or set sk_test_ for sandbox.` };
    }
    return { ok: false, error: String(msg) };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  opts?: { text?: string; idempotencyKey?: string }
) {
  const list = Array.isArray(to) ? to : [to];

  // Primary: SendByte REST if key present
  if (SENDBYTE_API_KEY) {
    let lastError: string | null = null;
    for (const rcpt of list) {
      const r = await sendViaSendByte(rcpt, subject, html, opts);
      if (r.ok) continue;
      // Fallback to SMTP/Gmail if SendByte rejects (e.g. domain not verified, key issue) and transporter is available
      const t = getTransporter();
      const shouldFallback =
        /domain_not_verified|401|535|invalid.*key/i.test(String(r.error)) && t;
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
      // do not fallback for other errors — surface SendByte error
      // but if SMTP is configured, try it once as safety net for 5xx/451
      if (t && /451|429|rate_limit|temporary/i.test(String(r.error))) {
        try {
          await t.sendMail({ from: FROM, to: rcpt, subject, html });
          lastError = null;
          continue;
        } catch {}
      }
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
        "No mail transporter configured. Set SENDBYTE_API_KEY (recommended, domain iyinekititechfest.com) or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or GMAIL_USER+GMAIL_APP_PASSWORD, and EMAIL_FROM=noreply@iyinekititechfest.com.",
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
    <h2 style="margin:0 0 12px;color:#F57F17">${SITE.name}</h2>
    ${inner}
    <p style="font-size:12px;color:#A0A0A0;margin-top:24px">${SITE.fullName}</p>
  </div>
</div>`;
