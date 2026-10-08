import { SITE } from "@/lib/site";

const FROM = process.env.EMAIL_FROM || "Iyin-Ekiti TechFest <onboarding@resend.dev>";

export async function sendEmail(to: string | string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return { ok: res.ok, error: res.ok ? null : await res.text() };
}

export const shell = (inner: string) => `
<div style="background:#04140e;padding:24px;font-family:Arial,sans-serif;color:#e8fff6">
  <div style="max-width:520px;margin:auto;background:#0b2a20;border:1px solid #14b8a6;border-radius:16px;padding:24px">
    <h2 style="margin:0 0 12px;color:#14b8a6">${SITE.name}</h2>
    ${inner}
    <p style="font-size:12px;color:#8fb5a5;margin-top:24px">${SITE.fullName}</p>
  </div>
</div>`;
