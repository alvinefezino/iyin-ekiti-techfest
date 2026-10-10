import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import { limited } from "@/lib/rate";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (limited(`chat:${ip}`)) return new Response("Too many requests", { status: 429 });
  if (!process.env.GROQ_API_KEY) return new Response("GROQ_API_KEY missing", { status: 500 });

  const { messages } = await req.json();
  if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });

  const sb = supabaseAdmin();
  const { data } = await sb.from("settings").select("key,value").in("key", ["chatbot_knowledge", "event_date"]);
  const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const knowledge = (s.chatbot_knowledge as string) || "No details have been added yet.";
  const date = (s.event_date as string) || SITE.eventDate;

  const system = `You are the official assistant for ${SITE.fullName}. Theme: ${SITE.theme}.
The event is a hackathon in Iyin Ekiti. Current event date: ${date}.
Answer ONLY from the knowledge below. If the answer isn't there, say you don't have that detail yet and suggest checking the website or contacting the organizers. Keep answers short and friendly.
FORMATTING RULES: Never use markdown. Do not use asterisks (*), double asterisks (**), hashes (#), underscores, or bullet stars. Do not use **bold** or *italic* or - lists with *. Write in plain sentences. Use line breaks only when needed.

KNOWLEDGE:
${knowledge}`;

  const CANDIDATES = [
    process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  async function callGroq(model: string) {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          { role: "system", content: system },
          ...messages.slice(-10).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) })),
        ],
      }),
    });
  }

  let upstream: Response | null = null;
  let lastStatus = 0;
  let lastText = "";
  for (const model of CANDIDATES) {
    try {
      const r = await callGroq(model);
      if (r.ok && r.body) {
        upstream = r;
        if (model !== CANDIDATES[0]) console.warn(`[chat] fallback succeeded with ${model}`);
        break;
      }
      lastStatus = r.status;
      lastText = await r.text().catch(() => "");
      const notFound = r.status === 404 && /model/i.test(lastText);
      console.error(`[chat] groq error ${r.status} model=${model}`, lastText.slice(0, 800));
      if (!notFound) break;
    } catch (e) {
      console.error(`[chat] fetch failed model=${model}`, e);
      lastStatus = 502;
      lastText = String(e);
      break;
    }
  }
  if (!upstream) {
    return new Response(`Upstream error ${lastStatus} ${lastText.slice(0, 400)}`, { status: 502 });
  }
  if (!upstream.body) {
    console.error("[chat] groq no body");
    return new Response("Upstream error: no body", { status: 502 });
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            let delta: string | undefined = JSON.parse(payload).choices?.[0]?.delta?.content;
            if (delta) {
              delta = delta
                .replace(/\*\*/g, "")
                .replace(/__([^_]+)__/g, "$1")
                .replace(/`+/g, "")
                .replace(/^#+\s*/gm, "")
                .replace(/^\s*\*\s+/gm, "• ")
                .replace(/\*([^\n*]+)\*/g, "$1");
              // final strip of any remaining stray * on this chunk
              delta = delta.replace(/\*/g, "");
              controller.enqueue(enc.encode(delta));
            }
          } catch {}
        }
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
