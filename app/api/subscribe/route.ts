import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, shell } from "@/lib/email";
import { SITE } from "@/lib/site";
import { limited } from "@/lib/rate";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (limited(`sub:${ip}`, 5)) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const sb = supabaseAdmin();
  const { data: existing } = await sb.from("subscribers").select("id,token").eq("email", email).maybeSingle();
  let token = existing?.token;
  if (existing) {
    await sb.from("subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
  } else {
    const { data, error } = await sb.from("subscribers").insert({ email }).select("token").single();
    if (error) return NextResponse.json({ error: "Couldn't subscribe. Try again." }, { status: 500 });
    token = data.token;
  }
  await sendEmail(email, `You're subscribed to ${SITE.name}`, shell(`<p>Thanks for subscribing. We'll email you when the event details change.</p><p style="font-size:12px"><a style="color:#F57F17" href="${SITE.url}/api/unsubscribe?token=${token}">Unsubscribe</a></p>`));
  return NextResponse.json({ ok: true });
}
