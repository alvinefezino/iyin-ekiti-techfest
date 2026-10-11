import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { fulfillOrder } from "@/lib/tickets";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_SECRET_KEY || "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  // constant-time compare to avoid timing side-channel
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  const valid = a.length === b.length && a.length > 0 ? timingSafeEqual(a, b) : false;
  if (!valid) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad payload" }, { status: 400 }); }
  if (evt.event === "charge.success" && evt.data?.reference) await fulfillOrder(evt.data.reference);
  return NextResponse.json({ ok: true });
}
