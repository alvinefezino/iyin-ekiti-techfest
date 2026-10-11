
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { limited, getClientIp } from "@/lib/rate";

const schema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional().default(""),
  team_name: z.string().max(120).optional().default(""),
  members: z.string().max(1000).optional().default(""),
  learning_interest: z.string().max(2000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (await limited(`att:${ip}`, 5)) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check your details and try again." }, { status: 400 });
  const d = parsed.data;
  const email = d.email.toLowerCase().trim();
  const { error } = await supabaseAdmin().from("event_attendees").insert({
    full_name: d.full_name,
    email,
    phone: d.phone,
    team_name: d.team_name,
    team_members: d.members.split("\n").map((s) => s.trim()).filter(Boolean),
    learning_interest: d.learning_interest?.trim() || null,
  });
  if (error) return NextResponse.json({ error: "Couldn't register. Try again." }, { status: 500 });

  // Welcome email for first-time attendee - white logo header, fire and forget
  const html = welcomeEmailHtml(d.full_name);
  sendEmail(email, `Welcome to Iyin Ekiti TechFest 2026`, html).catch((e) => console.error("[attendees] mail failed", e));

  return NextResponse.json({ ok: true });
}
