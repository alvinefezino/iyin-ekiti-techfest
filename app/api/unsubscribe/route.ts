import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    await supabaseAdmin().from("subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("token", token);
  }
  return new Response(
    `<html><body style="background:#04140e;color:#e8fff6;font-family:Arial;display:grid;place-items:center;height:100vh"><p>You've been unsubscribed.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
