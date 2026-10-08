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
<div style="background:#013216;padding:24px;font-family:Arial,sans-serif;color:#FFFFFF">
  <div style="max-width:520px;margin:auto;background:#013216;border:1px solid #F57F17;border-radius:16px;padding:24px">
    <h2 style="margin:0 0 12px;color:#F57F17">${SITE.name}</h2>
    ${inner}
    <p style="font-size:12px;color:#A0A0A0;margin-top:24px">${SITE.fullName}</p>
  </div>
</div>`;
