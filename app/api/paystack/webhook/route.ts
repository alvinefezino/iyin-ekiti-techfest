import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { fulfillOrder } from "@/lib/tickets";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature");
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "").update(raw).digest("hex");
  if (!sig || sig !== expected) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  const evt = JSON.parse(raw);
  if (evt.event === "charge.success" && evt.data?.reference) await fulfillOrder(evt.data.reference);
  return NextResponse.json({ ok: true });
}
