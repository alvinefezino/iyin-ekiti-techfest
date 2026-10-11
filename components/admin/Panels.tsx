"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const sb = () => supabaseBrowser();
const saveSetting = (key: string, value: unknown) => sb().from("settings").upsert({ key, value, updated_at: new Date().toISOString() });

export function ChatbotPanel() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    sb().from("settings").select("value").eq("key", "chatbot_knowledge").maybeSingle().then(({ data }) => setText((data?.value as string) ?? ""));
  }, []);
  return (
    <div className="glass p-4 max-w-3xl grid gap-3">
      <h2 className="font-semibold">Chatbot knowledge base</h2>
      <p className="text-sm text-muted">Everything the assistant knows about the event, speakers, schedule, rules and FAQs. Changes apply to the next chat message.</p>
      <textarea className="input font-mono text-sm" rows={18} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste event details, speaker bios, rules, venue info…" />
      <div className="flex flex-wrap gap-2 items-center">
        <button className="btn-primary !py-1.5 text-sm" onClick={async () => { const { error } = await saveSetting("chatbot_knowledge", text); setStatus(error ? error.message : "Saved"); }}>Save knowledge</button>
        <label className="btn-ghost !py-1.5 text-sm">
          Load from .txt or .md file
          <input type="file" accept=".txt,.md,.json,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        </label>
        <span className="text-xs text-muted">{text.length.toLocaleString()} characters</span>
        <span className="text-xs text-teal">{status}</span>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const [cookie, setCookie] = useState("");
  const [tickets, setTickets] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    sb().from("settings").select("key,value").in("key", ["cookie_text", "tickets_enabled"]).then(({ data }) => {
      const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      setCookie((s.cookie_text as string) ?? "");
      setTickets(s.tickets_enabled === true);
    });
  }, []);
  return (
    <div className="glass p-4 max-w-2xl grid gap-3">
      <h2 className="font-semibold">Site settings</h2>
      <div>
        <div className="text-xs text-muted mb-1">Cookie banner text</div>
        <textarea className="input" rows={3} value={cookie} onChange={(e) => setCookie(e.target.value)} />
      </div>
      <button className="btn-primary !py-1.5 text-sm w-fit" onClick={async () => { const { error } = await saveSetting("cookie_text", cookie); setStatus(error ? error.message : "Saved"); }}>Save</button>
      <span className="text-xs text-teal">{status}</span>
      <div className="text-sm border-t border-white/10 pt-3">
        <b>Ticket sales:</b> {tickets ? "on" : "off"}.{" "}
        <span className="text-muted">Add or remove the "Buy tickets" section in the Page builder, then publish. Publishing turns sales on or off automatically.</span>
      </div>
    </div>
  );
}

export function AudiencePanel() {
  const [subs, setSubs] = useState<{ email: string; subscribed_at: string; unsubscribed_at: string | null }[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [audience, setAudience] = useState<"subscribers" | "contestants">("subscribers");
  const [contestants, setContestants] = useState(0);
  useEffect(() => { sb().from("hackathon_registrations").select("email").then(({ data }) => setContestants(new Set((data ?? []).map((r: any) => String(r.email).toLowerCase())).size)); }, []);
  useEffect(() => { sb().from("subscribers").select("email,subscribed_at,unsubscribed_at").order("subscribed_at", { ascending: false }).then(({ data }) => setSubs((data as any) ?? [])); }, []);
  const active = subs.filter((s) => !s.unsubscribed_at);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass p-4 grid gap-3 content-start">
        <h2 className="font-semibold">Send a broadcast</h2>
        <div className="flex gap-1">
          {(["subscribers", "contestants"] as const).map((a) => (
            <button key={a} onClick={() => setAudience(a)} className={`px-3 py-1 rounded-full text-sm capitalize ${audience === a ? "bg-emerald" : "bg-white/10"}`}>{a}</button>
          ))}
        </div>
        <p className="text-sm text-muted">Goes to {audience === "contestants" ? contestants : active.length} {audience === "contestants" ? "registered contestant" : "active subscriber"}{(audience === "contestants" ? contestants : active.length) === 1 ? "" : "s"}.</p>
        <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="input" rows={8} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn-primary !py-1.5 text-sm w-fit" onClick={async () => {
          const count = audience === "contestants" ? contestants : active.length;
          if (!confirm(`Send to ${count} ${audience}?`)) return;
          setMsg("Sending…");
          const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body, audience }) });
          const j = await res.json().catch(() => ({} as any));
          if (!res.ok) setMsg(j.error ? `Failed: ${String(j.error).slice(0,300)}` : `Failed (${res.status})`);
          else if (j.sent === 0 && j.error) setMsg(`Failed: ${String(j.error).slice(0,300)}`);
          else setMsg(`Sent to ${j.sent} of ${j.total}.`);
        }}>Send broadcast</button>
        <span className="text-xs text-teal">{msg}</span>
      </div>
      <div className="glass p-4 max-h-[32rem] overflow-y-auto">
        <h2 className="font-semibold mb-2">Subscribers ({active.length})</h2>
        {subs.map((s) => (
          <div key={s.email} className="flex justify-between text-sm py-1 border-b border-white/10">
            <span className={s.unsubscribed_at ? "line-through text-muted" : ""}>{s.email}</span>
            <span className="text-xs text-muted">{new Date(s.subscribed_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegistrationsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { sb().from("hackathon_registrations").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  const csv = () => {
    const head = ["full_name", "email", "phone", "team_name", "team_members", "created_at"];
    const esc = (v: any) => '"' + String(Array.isArray(v) ? v.join("; ") : v ?? "").replace(/"/g, '""') + '"';
    const out = [head.join(","), ...rows.map((r) => head.map((h) => esc(r[h])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
    a.download = "registrations.csv";
    a.click();
  };
  return (
    <div className="glass p-4">
      <div className="flex justify-between items-center mb-3">
        <div><h2 className="font-semibold">Hackathon registrations ({rows.length})</h2><p className="text-xs text-muted">Registrations now receive the Hackathon Stage email automatically. No Exam Terminal.</p></div>
        <button className="btn-ghost !py-1 text-sm" onClick={csv}>Download CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[40rem]">
          <thead><tr className="text-left text-muted"><th className="py-1">Name</th><th>Email</th><th>Phone</th><th>Team</th><th>Members</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td className="py-1">{r.full_name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.team_name}</td><td>{(r.team_members ?? []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AttendeesPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { sb().from("event_attendees").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  const csv = () => {
    const head = ["full_name", "email", "learning_interest", "phone", "team_name", "team_members", "created_at"];
    const esc = (v: any) => '"' + String(Array.isArray(v) ? v.join("; ") : v ?? "").replace(/"/g, '""') + '"';
    const out = [head.join(","), ...rows.map((r) => head.map((h) => esc(r[h])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
    a.download = "attendees.csv";
    a.click();
  };
  return (
    <div className="glass p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Event attendees ({rows.length})</h2>
        <button className="btn-ghost !py-1 text-sm" onClick={csv}>Download CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[48rem]">
          <thead><tr className="text-left text-muted"><th className="py-1">Name</th><th>Email</th><th>Wants to learn</th><th>Phone</th><th>Team</th><th>Members</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td className="py-1">{r.full_name}</td><td>{r.email}</td><td className="max-w-[14rem] truncate" title={r.learning_interest || ""}>{r.learning_interest || "-"}</td><td>{r.phone}</td><td>{r.team_name}</td><td>{(r.team_members ?? []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



export function CheckinPanel() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<() => void>(() => {});

  async function check(c: string) {
    const res = await fetch("/api/tickets/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) });
    const j = await res.json();
    setResult(j.status === "ok" ? `Valid. Welcome ${j.order?.full_name ?? ""}` : j.status === "used" ? `Already used at ${new Date(j.at).toLocaleTimeString()}` : j.status === "invalid" ? "Invalid ticket" : "Not allowed");
  }

  async function scan() {
    const BD = (window as any).BarcodeDetector;
    if (!BD) { setResult("Camera scanning isn't supported in this browser. Type the code instead."); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    setScanning(true);
    if (video.current) { video.current.srcObject = stream; await video.current.play(); }
    const det = new BD({ formats: ["qr_code"] });
    let alive = true;
    stop.current = () => { alive = false; stream.getTracks().forEach((t) => t.stop()); setScanning(false); };
    const loop = async () => {
      if (!alive || !video.current) return;
      try {
        const found = await det.detect(video.current);
        if (found[0]?.rawValue) { await check(found[0].rawValue); stop.current(); return; }
      } catch {}
      setTimeout(loop, 300);
    };
    loop();
  }
  useEffect(() => () => stop.current(), []);

  return (
    <div className="glass p-4 max-w-md grid gap-3">
      <h2 className="font-semibold">Ticket check in</h2>
      <div className="flex gap-2">
        <input className="input" placeholder="Ticket code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn-primary shrink-0 !py-1.5 text-sm" onClick={() => check(code)}>Check</button>
      </div>
      <button className="btn-ghost !py-1.5 text-sm" onClick={scanning ? () => stop.current() : scan}>{scanning ? "Stop camera" : "Scan QR with camera"}</button>
      {scanning && <video ref={video} className="rounded-xl w-full" muted playsInline />}
      {result && <p className="text-lg font-medium">{result}</p>}
    </div>
  );
}

export function SponsorPromoPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const load = async () => {
    const res = await fetch("/api/admin/sponsor-promos");
    const j = await res.json().catch(()=>({}));
    if (res.ok) setRows(j.rows ?? []);
    else setMsg(j.error || "Failed to load");
  };
  useEffect(()=>{ load(); }, []);
  const patch = async (id:string, status:string) => {
    setMsg("Saving…");
    const res = await fetch("/api/admin/sponsor-promos", { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ id, status }) });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) setMsg(j.error || "Failed");
    else { setMsg("Updated"); load(); }
  };
  const formatNaira = (n:number) => "\u20A6" + Number(n||0).toLocaleString("en-NG");
  const csv = () => {
    const head = ["sponsor_name","promo_code","reference_id","status","items","total_naira","bank_name","account_number","account_name","created_at"];
    const esc=(v:any)=>'"'+String(v??"").replace(/"/g,'""')+'"';
    const out=[head.join(","), ...rows.map((r:any)=> head.map((h)=> h==="items" ? esc(JSON.stringify(r[h]??[])) : esc(r[h])).join(","))].join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([out],{type:"text/csv"})); a.download="sponsor_promo_payments.csv"; a.click();
  };
  const pending = rows.filter((r:any)=> r.status==="pending").length;
  return (
    <div className="glass p-3 sm:p-4 grid gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-sm sm:text-base">Sponsor orders {pending ? <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F57F17] text-black text-xs">{pending} pending</span> : null}</h2>
        <div className="flex gap-2">
          <button className="btn-ghost !py-1 !px-3 text-xs sm:text-sm" onClick={load}>Refresh</button>
          <button className="btn-ghost !py-1 !px-3 text-xs sm:text-sm" onClick={csv}>Download CSV</button>
        </div>
      </div>
      <p className="text-xs text-muted">Orders from the sponsor food menu. Customer picks items to build a combo then pays to 6586455889 OPay Lumibakes&Treats and submits Reference ID.</p>
      {msg && <p className="text-xs text-teal">{msg}</p>}

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {!rows.length && <div className="py-8 text-center text-muted text-sm border border-dashed border-white/15 rounded-xl">No orders yet. Highlight a sponsor in Page builder then test the menu flow on the site.</div>}
        {rows.map((r:any)=> {
          const items: any[] = Array.isArray(r.items) ? r.items : [];
          return (
          <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 grid gap-2">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-sm">{r.sponsor_name}</span>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs h-fit ${r.status==="verified"?"bg-[#F57F17] text-black": r.status==="rejected"?"bg-white text-black":"bg-white/15 text-white border border-white/15"}`}>{r.status}</span>
            </div>
            <div className="text-xs font-mono"><span className="text-muted">Ref</span> <b>{r.reference_id}</b> <span className="text-[#F57F17]">{r.promo_code}</span></div>
            {items.length ? (
              <div className="rounded-lg bg-black/20 border border-white/10 p-2">
                <div className="text-[11px] tracking-widest uppercase text-white/60 font-bold">Combo</div>
                <div className="mt-1 grid gap-1">
                  {items.map((it:any, i:number)=> (
                    <div key={i} className="flex justify-between text-xs"><span className="truncate pr-2">{it.name} ×{it.qty ?? 1}</span><span className="font-mono text-[#F57F17] shrink-0">{formatNaira((it.price||0)*(it.qty??1))}</span></div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs font-bold"><span>Total</span><span className="font-mono text-[#F57F17]">{formatNaira(r.total_naira||0)}</span></div>
              </div>
            ) : <div className="text-xs text-muted">No items recorded</div>}
            <div className="text-xs text-muted font-mono">{r.bank_name || "Lumibakes&Treats"} · {r.account_number || "6586455889"} {r.account_name || "OPay"}</div>
            <div className="text-[11px] text-muted">{new Date(r.created_at).toLocaleString()}</div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-full bg-[#F57F17] text-black text-xs font-bold disabled:opacity-40" disabled={r.status==="verified"} onClick={()=>patch(r.id,"verified")}>Verify</button>
              <button className="flex-1 py-2 rounded-full bg-white/10 text-xs disabled:opacity-40" disabled={r.status==="rejected"} onClick={()=>patch(r.id,"rejected")}>Reject</button>
            </div>
          </div>
        )})}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[58rem]">
          <thead><tr className="text-left text-muted text-xs"><th className="py-1">When</th><th>Sponsor</th><th>Ref</th><th>Combo</th><th>Total</th><th>Account</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r:any)=> {
              const items: any[] = Array.isArray(r.items) ? r.items : [];
              return (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td className="py-2 text-xs text-muted whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="text-xs font-medium max-w-[9rem] truncate">{r.sponsor_name}</td>
                <td><div className="font-mono text-xs font-bold">{r.reference_id}</div><div className="font-mono text-[11px] text-[#F57F17]">{r.promo_code}</div></td>
                <td className="text-xs max-w-[18rem]">{items.length ? items.map((it:any)=> `${it.name} ×${it.qty??1}`).join(" · ") : <span className="text-muted">no items</span>}</td>
                <td className="font-mono text-xs font-bold text-[#F57F17] whitespace-nowrap">{r.total_naira ? formatNaira(r.total_naira) : "-"}</td>
                <td className="text-xs"><span className="font-mono">{r.account_number || "-"}</span><div className="text-muted text-[11px]">{r.bank_name || ""} {r.account_name || ""}</div></td>
                <td><span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${r.status==="verified"?"bg-[#F57F17] text-black": r.status==="rejected"?"bg-white text-black":"bg-white/15 text-white border border-white/15"}`}>{r.status}</span></td>
                <td className="flex gap-1 py-1">
                  <button className="px-2 py-1 rounded-full bg-[#F57F17] text-black text-xs disabled:opacity-40 whitespace-nowrap" disabled={r.status==="verified"} onClick={()=>patch(r.id,"verified")}>Verify</button>
                  <button className="px-2 py-1 rounded-full bg-white/10 text-xs disabled:opacity-40" disabled={r.status==="rejected"} onClick={()=>patch(r.id,"rejected")}>Reject</button>
                </td>
              </tr>
            )})}
            {!rows.length && <tr><td colSpan={8} className="py-8 text-center text-muted text-sm">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminAIPanel() {
  const [prompt, setPrompt] = useState("");
  const [audience, setAudience] = useState<"subscribers" | "contestants">("contestants");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [counts, setCounts] = useState({ subs: 0, contestants: 0 });

  useEffect(() => {
    sb().from("subscribers").select("email").is("unsubscribed_at", null).then(({ data }) => setCounts((c) => ({ ...c, subs: (data ?? []).length })));
    sb().from("hackathon_registrations").select("email").then(({ data }) => setCounts((c) => ({ ...c, contestants: new Set((data ?? []).map((r: any) => String(r.email).toLowerCase())).size })));
  }, []);

  const count = audience === "contestants" ? counts.contestants : counts.subs;

  const draft = async () => {
    if (!prompt.trim()) { setMsg("Describe what you want the email to say."); return; }
    setDrafting(true); setMsg("Drafting with AI…");
    try {
      const res = await fetch("/api/admin/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, audience, mode: "broadcast" }) });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) setMsg(j.error ? String(j.error).slice(0, 400) : `Failed ${res.status}`);
      else { setSubject(j.subject || ""); setBody(j.body || ""); setMsg("Draft ready - review then Send. Uses {{name}} so each person gets their real name (from registration or Gmail like john.doe@gmail.com → John)."); }
    } catch (e: any) { setMsg(String(e?.message || e).slice(0,300)); }
    setDrafting(false);
  };

  const send = async () => {
    if (!subject.trim() || !body.trim()) { setMsg("Subject and message are required."); return; }
    if (!confirm(`Send to ${count} ${audience}? Each person will be addressed by their real name (Gmail fallback, never "first name" or "contestant").`)) return;
    setSending(true); setMsg("Sending…");
    const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body, audience }) });
    const j = await res.json().catch(() => ({} as any));
    setSending(false);
    if (!res.ok) setMsg(j.error ? `Failed: ${String(j.error).slice(0,300)}` : `Failed (${res.status})`);
    else if (j.sent === 0 && j.error) setMsg(`Failed: ${String(j.error).slice(0,300)}`);
    else setMsg(`Sent to ${j.sent} of ${j.total}${j.skipped ? ` (skipped ${j.skipped} test/duplicate)` : ""}. ${j.error ? String(j.error).slice(0,200) : ""}`);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass p-4 grid gap-3 content-start">
        <h2 className="font-semibold">AI Assistant - Email drafts & sending</h2>
        <p className="text-xs text-muted">Describe the email in plain English. AI drafts subject + body with {"{{name}}"} so each recipient gets their real name - from hackathon_registrations or Gmail (e.g. ada.lovelace@gmail.com → Ada), never &quot;first name&quot; or &quot;contestant&quot;.</p>
        <div className="flex gap-1">
          {(["contestants", "subscribers"] as const).map((a) => (
            <button key={a} onClick={() => setAudience(a)} className={`px-3 py-1 rounded-full text-sm capitalize ${audience === a ? "bg-[#F57F17] text-black" : "bg-white/10"}`}>{a} <span className="text-xs opacity-70">({a === "contestants" ? counts.contestants : counts.subs})</span></button>
          ))}
        </div>
        <textarea className="input min-h-[90px] text-sm" placeholder="e.g. Write a warm reminder to contestants that MVP submissions close Friday and they should prepare 5-slide decks." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button className="btn-primary !py-2 text-sm w-fit disabled:opacity-50" disabled={drafting} onClick={draft}>{drafting ? "Drafting…" : "Draft with AI"}</button>
        <div className="border-t border-white/10 pt-3 grid gap-3">
          <input className="input text-sm" placeholder="Subject (AI fills this)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className="input min-h-[180px] text-sm whitespace-pre-wrap" placeholder="Message body - use {{name}} where you want the person's name. AI drafts this for you." value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="text-[11px] text-muted">Tip: keep {"{{name}}"} / {"{{firstName}}"} / {"{{fullName}}"} in the draft - server replaces it per-recipient before sending. Stray &quot;first name&quot; or &quot;contestant&quot; is auto-replaced with the real name.</div>
          <button className="btn-primary !py-2 text-sm w-fit disabled:opacity-50" disabled={sending || !subject.trim() || !body.trim()} onClick={send}>{sending ? "Sending…" : `Send to ${count} ${audience}`}</button>
        </div>
        {msg && <p className="text-xs text-teal whitespace-pre-wrap break-words">{msg}</p>}
      </div>
      <div className="glass p-4 grid gap-3 content-start">
        <h3 className="font-semibold text-sm">Preview (Gmail name fallback)</h3>
        <p className="text-xs text-muted">How the greeting personalizes per recipient. If no registration name, Gmail local-part is used: john.doe123@gmail.com → John, ada_lovelace@gmail.com → Ada.</p>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 grid gap-2">
          <div className="text-xs"><span className="text-muted">Subject:</span> <b>{subject || <span className="text-muted">-</span>}</b></div>
          <div className="text-xs whitespace-pre-wrap break-words bg-white/5 rounded-lg p-3 min-h-[160px]">{
            body
              ? body.replace(/\{\{\s*(name|firstName|first[_\- ]?name)\s*\}\}/gi, "John").replace(/\{\{\s*fullName\s*\}\}/gi, "John Doe").replace(/\b(first name|contestant)s?\b/gi, "John")
              : <span className="text-muted">Draft appears here… try "Draft with AI" then edit before sending.</span>
          }</div>
          <div className="text-[11px] text-muted">Example recipient: ada.lovelace@gmail.com → &quot;Hi Ada,&quot; · Tobi (has registration name) → &quot;Hi Tobi,&quot; - never &quot;Hi first name,&quot; or &quot;Hi contestant,&quot;.</div>
        </div>
        <div className="rounded-xl border border-[#F57F17]/30 bg-[#F57F17]/10 p-3">
          <div className="text-xs font-bold text-[#F57F17]">How names are picked</div>
          <ul className="text-xs text-muted list-disc pl-4 mt-1 grid gap-1">
            <li>Contestants: hackathon_registrations.full_name first word → fallback to Gmail local-part before @</li>
            <li>Subscribers: registration name if email overlaps, else Gmail local-part</li>
            <li>Exam & Invite mails: same Gmail fallback (Dear John, / Hi Ada,)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

