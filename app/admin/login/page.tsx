"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SITE } from "@/lib/site";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form
        className="glass-strong p-8 w-full max-w-sm grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
          if (error) { setErr("Wrong email or password."); setBusy(false); return; }
          router.push("/admin");
          router.refresh();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SITE.logo} alt={SITE.name} className="w-40 mx-auto rounded" />
        <h1 className="text-xl font-semibold text-center">Admin sign in</h1>
        <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {err && <p className="text-sm text-countdown">{err}</p>}
      </form>
    </main>
  );
}
