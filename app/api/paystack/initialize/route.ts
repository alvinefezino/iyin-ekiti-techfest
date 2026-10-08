import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import { limited } from "@/lib/rate";

const schema = z.object({ full_name: z.string().min(2).max(120), email: z.string().email(), quantity: z.number().int().min(1).max(10) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (limited(`pay:${ip}`, 8)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check your details." }, { status: 400 });
  const sb = supabaseAdmin();

  const [{ data: setting }, { data: page }] = await Promise.all([
    sb.from("settings").select("value").eq("key", "tickets_enabled").maybeSingle(),
    sb.from("pages").select("published").eq("slug", "home").maybeSingle(),
  ]);
  if (setting?.value !== true) return NextResponse.json({ error: "Ticket sales are closed." }, { status: 403 });
  const block = (page?.published as any[] | undefined)?.find((b) => b.type === "tickets");
  const price = Number(block?.props?.price);
  if (!price || price <= 0) return NextResponse.json({ error: "Ticket price not set." }, { status: 400 });

  const d = parsed.data;
  const reference = `TF-${randomBytes(8).toString("hex")}`;
  const amount = price * d.quantity * 100;
  const { error } = await sb.from("orders").insert({ reference, email: d.email.toLowerCase(), full_name: d.full_name, quantity: d.quantity, amount_kobo: amount });
  if (error) return NextResponse.json({ error: "Couldn't create order." }, { status: 500 });

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: d.email, amount, reference, currency: "NGN", callback_url: `${SITE.url}/tickets/success` }),
  });
  const json = await res.json();
  if (!res.ok) return NextResponse.json({ error: "Paystack error. Try again." }, { status: 502 });
  return NextResponse.json({ url: json.data.authorization_url });
}
