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
  if (RESEND_API_KEY) {
    let lastError: string | null = null;
    for (const rcpt of list) {
      const r = await sendViaResend(rcpt, subject, html);
      if (r.ok) continue;
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

// White logo header - fixes Gmail showing "O" initial instead of brand
// Uses absolute URL so every client renders the logo. Falls back to text if image blocked.
const logoUrl = `${SITE.url}/logo-white.jpg`;

export const shell = (inner: string) => `
<div style="background:#013216;padding:24px;font-family:Arial,sans-serif;color:#FFFFFF">
  <div style="max-width:560px;margin:0 auto;background:#013216;border:1px solid #F57F17;border-radius:16px;overflow:hidden">
    <div style="background:#013216;padding:20px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.12)">
      <img src="${logoUrl}" alt="Iyin Ekiti TechFest" width="160" height="48" style="display:block;margin:0 auto;max-width:160px;height:auto;object-fit:contain" />
      <div style="margin-top:8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#F57F17;font-weight:700">Iyin Ekiti TechFest &middot; Thinking Beyond Borders</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px">powered by FIESU and FUTES Gotham Mafians</div>
    </div>
    <div style="background:#FFFFFF;color:#0a0a0a;padding:24px;border-radius:0 0 16px 16px">
      ${inner}
      <p style="font-size:11px;color:#9CA3AF;margin:20px 0 0;border-top:1px solid #e5e7eb;padding-top:12px">Iyin Ekiti TechFest powered by FIESU and FUTES Gotham Mafians &middot; ${SITE.url}</p>
    </div>
  </div>
</div>`;

// Branded helpers - use these so every mail has the white logo header automatically
export function welcomeEmailHtml(name: string) {
  const safe = name.replace(/[<>]/g, "");
  return shell(`
    <p style="margin:0 0 12px;font-size:15px">Hi ${safe},</p>
    <p style="margin:0 0 12px;line-height:1.6">Welcome to <strong>Iyin Ekiti TechFest 2026</strong> — we are excited to have you join us. Your event attendee registration is confirmed.</p>
    <p style="margin:0 0 12px;line-height:1.6">You will receive updates about schedule, venue, and check in details closer to the event. Keep this email for your records.</p>
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:14px 16px;margin:16px 0;text-align:center">
      <div style="font-size:13px;color:#166534;font-weight:700">What is next</div>
      <div style="font-size:13px;color:#15803D;margin-top:4px">Watch your inbox for hackathon, speaker, and ticket announcements</div>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#013216;font-weight:600">See you at Iyin Ekiti</p>
    <p style="margin:2px 0 0;font-size:13px;color:#013216">Iyin Ekiti TechFest Team</p>
  `);
}

export function hackathonEmailHtml(name: string) {
  const safe = name.replace(/[<>]/g, "");
  return shell(`
    <p style="margin:0 0 12px;font-size:15px">Hi ${safe},</p>
    <p style="margin:0 0 12px;line-height:1.6">Your <strong>hackathon registration</strong> for Iyin Ekiti TechFest 2026 is confirmed. We have saved your team details and will send next steps soon.</p>
    <p style="margin:0 0 12px;line-height:1.6">Selected teams will receive an Exam Terminal link. The assessment is 50 questions in 20 minutes. Covers general tech and problem solving.</p>
    <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:14px 16px;margin:16px 0">
      <div style="font-weight:700;color:#9A3412;margin-bottom:6px">Keep in mind</div>
      <ul style="margin:0;padding-left:18px;color:#7C2D12;font-size:13px;line-height:1.6">
        <li>Use a laptop or desktop with stable internet for the exam</li>
        <li>One attempt only. Timer auto submits at 00:00</li>
        <li>Score 20 of 50 to qualify for the MVP stage</li>
      </ul>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#013216;font-weight:600">We can not wait to see what you build</p>
    <p style="margin:2px 0 0;font-size:13px;color:#013216">FIESU and Iyin Ekiti TechFest Team</p>
  `);
}
