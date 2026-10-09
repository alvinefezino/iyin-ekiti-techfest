import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SITE } from "@/lib/site";

const FROM =
  process.env.EMAIL_FROM ||
  (process.env.GMAIL_USER ? `Iyin-Ekiti TechFest <${process.env.GMAIL_USER}>` : "Iyin-Ekiti TechFest <noreply@iyinekititechfest.com>");

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

export async function sendEmail(to: string | string[], subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    return {
      ok: false as const,
      error: "No mail transporter configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or GMAIL_USER+GMAIL_APP_PASSWORD (and EMAIL_FROM).",
    };
  }
  const list = Array.isArray(to) ? to : [to];
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
