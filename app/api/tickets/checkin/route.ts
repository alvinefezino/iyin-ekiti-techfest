import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await req.json();
  const clean = String(code || "").replace(/^TF:/, "").trim().toUpperCase();
  const sb = supabaseAdmin();
  const { data: t } = await sb.from("tickets").select("id,checked_in_at,orders(full_name,email)").eq("code", clean).maybeSingle();
  if (!t) return NextResponse.json({ status: "invalid" });
  if (t.checked_in_at) return NextResponse.json({ status: "used", at: t.checked_in_at, order: t.orders });
  await sb.from("tickets").update({ checked_in_at: new Date().toISOString() }).eq("id", t.id);
  return NextResponse.json({ status: "ok", order: t.orders });
}
