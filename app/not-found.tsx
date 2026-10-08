import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="glass-strong p-8 text-center max-w-md">
        <p className="font-mono text-countdown text-6xl font-bold">404</p>
        <h1 className="text-2xl font-semibold mt-3">This page isn't on the network</h1>
        <p className="text-muted mt-2 text-sm">
          <code className="font-mono">GET {"{this page}"}</code> returned nothing. Check the link or head back home.
        </p>
        <Link href="/" className="btn-primary mt-6">Back to the TechFest</Link>
      </div>
    </main>
  );
}
