import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { limited } from "@/lib/rate";

const schema = z.object({
  sponsor_name: z.string().min(1).max(200),
  promo_code: z.string().min(1).max(80),
  bank_name: z.string().max(200).optional().default(""),
  account_number: z.string().max(80).optional().default(""),
  account_name: z.string().max(200).optional().default(""),
  reference_id: z.string().min(3).max(120),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (limited(`sponsor-promo:${ip}`, 12)) return NextResponse.json({ error: "Too many attempts. Try again." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(()=>({})));
  if (!parsed.success) return NextResponse.json({ error: "Check your details and try again." }, { status: 400 });
  const d = parsed.data;
  const { error } = await supabaseAdmin().from("sponsor_promo_payments").insert({
    sponsor_name: d.sponsor_name,
    promo_code: d.promo_code,
    bank_name: d.bank_name,
    account_number: d.account_number,
    account_name: d.account_name,
    reference_id: d.reference_id,
  });
  if (error) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
