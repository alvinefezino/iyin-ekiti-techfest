import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("sponsor_promo_payments").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json().catch(()=>({}));
  if (!id || !["pending","verified","rejected"].includes(status)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { error } = await supabaseAdmin().from("sponsor_promo_payments").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
