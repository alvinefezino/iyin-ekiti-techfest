"use client";
import { useState } from "react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col sm:flex-row gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { ok, data } = await post("/api/subscribe", { email });
        setMsg(ok ? "You're subscribed." : data.error || "Something went wrong. Try again.");
        if (ok) setEmail("");
        setBusy(false);
      }}
    >
      <input className="input" type="email" required placeholder="name@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn-primary shrink-0" disabled={busy}>{busy ? "Subscribing…" : "Subscribe"}</button>
      {msg && <p className="text-sm text-teal sm:self-center">{msg}</p>}
    </form>
  );
}

export function RegisterForm() {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", team_name: "", members: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="glass p-5 grid gap-3 max-w-xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { ok, data } = await post("/api/register", f);
        setMsg(ok ? "You're registered. Check your email for next steps." : data.error || "Something went wrong. Try again.");
        if (ok) setF({ full_name: "", email: "", phone: "", team_name: "", members: "" });
        setBusy(false);
      }}
    >
      <input className="input" required placeholder="Full name" value={f.full_name} onChange={set("full_name")} />
      <input className="input" required type="email" placeholder="Email" value={f.email} onChange={set("email")} />
      <input className="input" placeholder="Phone number" value={f.phone} onChange={set("phone")} />
      <input className="input" placeholder="Team name (optional)" value={f.team_name} onChange={set("team_name")} />
      <textarea className="input" rows={3} placeholder="Team members, one per line" value={f.members} onChange={set("members")} />
      <button className="btn-primary" disabled={busy}>{busy ? "Registering…" : "Register"}</button>
      {msg && <p className="text-sm text-teal">{msg}</p>}
    </form>
  );
}

export function TicketForm({ name, price }: { name: string; price: number }) {
  const [f, setF] = useState({ full_name: "", email: "", quantity: 1 });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="glass p-5 grid gap-3 max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { ok, data } = await post("/api/paystack/initialize", f);
        if (ok && data.url) window.location.href = data.url;
        else {
          setMsg(data.error || "Couldn't start checkout. Try again.");
          setBusy(false);
        }
      }}
    >
      <p className="font-medium">{name} · ₦{price.toLocaleString()}</p>
      <input className="input" required placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      <input className="input" required type="email" placeholder="Email for your receipt" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="number" min={1} max={10} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />
      <button className="btn-primary" disabled={busy}>{busy ? "Redirecting…" : `Pay ₦${(price * f.quantity).toLocaleString()}`}</button>
      {msg && <p className="text-sm text-countdown">{msg}</p>}
    </form>
  );
}
