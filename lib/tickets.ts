import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, shell } from "@/lib/email";
import { SITE } from "@/lib/site";

export async function fulfillOrder(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { ok: false, error: "Paystack not configured" };
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json?.data?.status !== "success") return { ok: false, error: "Payment not confirmed" };

  const sb = supabaseAdmin();
  const { data: order } = await sb.from("orders").select("*").eq("reference", reference).maybeSingle();
  if (!order) return { ok: false, error: "Order not found" };
  if (json.data.amount !== order.amount_kobo) return { ok: false, error: "Amount mismatch" };
  if (order.status === "paid") return { ok: true, already: true, email: order.email };

  const { data: claimed } = await sb.from("orders").update({ status: "paid" }).eq("id", order.id).eq("status", "pending").select("id");
  if (!claimed?.length) return { ok: true, already: true, email: order.email };

  const codes = Array.from({ length: order.quantity }, () => randomBytes(6).toString("hex").toUpperCase());
  await sb.from("tickets").insert(codes.map((code) => ({ order_id: order.id, code })));

  const qrs = codes.map((c) => `<div style="margin:16px 0;text-align:center"><img src="${SITE.url}/api/qr/${c}" width="180" height="180" alt="QR ${c}" style="background:#fff;padding:8px;border-radius:12px"/><div style="font-family:monospace;margin-top:6px">${c}</div></div>`).join("");
  await sendEmail(order.email, `Your ${SITE.name} ticket${codes.length > 1 ? "s" : ""}`, shell(`
    <p>Hi ${String(order.full_name).replace(/[<>]/g, "")}, your payment of ₦${(order.amount_kobo / 100).toLocaleString()} was received.</p>
    <p>Show the QR code at the entrance:</p>${qrs}
    <p style="font-size:12px;color:#8fb5a5">Reference: ${reference}</p>`));
  return { ok: true, email: order.email };
}
