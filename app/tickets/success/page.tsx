import Link from "next/link";
import { fulfillOrder } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function Success({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const ref = sp.reference || sp.trxref;
  const r = ref ? await fulfillOrder(ref) : { ok: false, error: "Missing reference" };
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="glass-strong p-8 text-center max-w-md">
        <h1 className="text-2xl font-semibold">{r.ok ? "Payment received" : "We couldn't confirm your payment"}</h1>
        <p className="text-muted mt-2 text-sm">
          {r.ok ? `Your ticket and QR code were sent to ${(r as any).email}. Check your inbox and spam folder.` : "If you were charged, your ticket will still arrive by email. Contact the organizers if it doesn't."}
        </p>
        <Link href="/" className="btn-primary mt-6">Back to the site</Link>
      </div>
    </main>
  );
}
