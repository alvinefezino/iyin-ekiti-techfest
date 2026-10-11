import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

export const maxDuration = 30;

const CANDIDATES = [
  process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
].filter((v, i, a) => v && a.indexOf(v) === i);

async function callGroq(messages: { role: string; content: string }[], model: string) {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.4, max_tokens: 900, messages }),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "GROQ_API_KEY missing on server" }, { status: 500 });

  const { prompt, audience, mode } = await req.json().catch(() => ({} as any));
  const p = String(prompt || "").trim();
  if (!p) return NextResponse.json({ error: "Prompt is required. Example: Write a warm broadcast to contestants about the MVP deadline." }, { status: 400 });
  const aud = audience === "contestants" ? "contestants" : audience === "subscribers" ? "subscribers" : "contestants";
  const m = mode === "invite" ? "invite" : "broadcast";

  const system = `You are the email drafting assistant for ${SITE.fullName} (${SITE.theme}).
Write a single email as JSON. Never use markdown asterisks. Use plain text with line breaks.
Audience: ${aud}. Mode: ${m}.
Rules:
- Return ONLY valid JSON with keys "subject" and "body" (no extra keys, no markdown fence).
- Subject: concise, 6-12 words, no asterisks.
- Body: warm, professional, concise. Use {{name}} wherever you would address the person - never write "first name", "contestant", "Dear contestant", or "Hello first name". Use "Hi {{name}}," or "Dear {{name}}," as the greeting.
- Do NOT include the greeting in subject. Body should start with greeting line.
- Keep body plain text (use \\n for paragraphs). The server will personalize {{name}} from the person's real name or Gmail before sending.
- Event context: Iyin Ekiti TechFest 2026 Hackathon by FIESU, date ${SITE.eventDate}.`;

  let lastText = "";
  let lastStatus = 0;
  let parsed: { subject: string; body: string } | null = null;

  for (const model of CANDIDATES) {
    const r = await callGroq(
      [
        { role: "system", content: system },
        { role: "user", content: p },
      ],
      model
    );
    if (!r.ok) {
      lastStatus = r.status;
      lastText = await r.text().catch(() => "");
      const notFound = r.status === 404 && /model/i.test(lastText);
      console.error(`[admin/ai] groq error ${r.status} model=${model}`, lastText.slice(0, 600));
      if (!notFound) break;
      continue;
    }
    const j: any = await r.json().catch(() => null);
    const content: string = j?.choices?.[0]?.message?.content ?? "";
    lastText = content;
    // Strip fences and extract JSON
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        const obj = JSON.parse(cleaned.slice(start, end + 1));
        if (obj.subject && obj.body) {
          parsed = { subject: String(obj.subject).slice(0, 120), body: String(obj.body).slice(0, 4000) };
          break;
        }
      } catch {}
    }
    lastText = content.slice(0, 600);
  }

  if (!parsed) return NextResponse.json({ error: `AI could not draft email. ${lastText.slice(0, 300)}`, status: lastStatus || 502 }, { status: 502 });
  // Final sanitize: never send literal "first name" / "contestant" - replace with {{name}}
  parsed.body = parsed.body.replace(/\b(first name|contestant)s?\b/gi, "{{name}}");
  return NextResponse.json({ ok: true, subject: parsed.subject, body: parsed.body });
}
