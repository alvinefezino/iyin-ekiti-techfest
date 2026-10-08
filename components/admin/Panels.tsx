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
  useEffect(() => { sb().from("subscribers").select("email,subscribed_at,unsubscribed_at").order("subscribed_at", { ascending: false }).then(({ data }) => setSubs((data as any) ?? [])); }, []);
  const active = subs.filter((s) => !s.unsubscribed_at);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass p-4 grid gap-3 content-start">
        <h2 className="font-semibold">Send a broadcast</h2>
        <p className="text-sm text-muted">Goes to {active.length} active subscriber{active.length === 1 ? "" : "s"}.</p>
        <input className="input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="input" rows={8} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn-primary !py-1.5 text-sm w-fit" onClick={async () => {
          if (!confirm(`Send to ${active.length} subscribers?`)) return;
          setMsg("Sending…");
          const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body }) });
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviteMsg, setInviteMsg] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { sb().from("hackathon_registrations").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  const toggle = (email: string) => setSelected((s) => { const n = new Set(s); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  const sendInvites = async () => {
    if (selected.size === 0) { setInviteMsg("Select at least one"); return; }
    if (!confirm(`Send Exam Terminal invite to ${selected.size} selected? They will get an automatic mail with their link. Copy/paste/screenshot/exit will disqualify them.`)) return;
    setSending(true); setInviteMsg("Sending…");
    const res = await fetch("/api/exam/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: Array.from(selected) }) });
    const j = await res.json().catch(() => ({} as any));
    setSending(false);
    if (!res.ok) setInviteMsg(j.error ? String(j.error).slice(0,400) : `Failed ${res.status}`);
    else {
      const ok = (j.results ?? []).filter((r: any) => !r.error).length;
      const fail = (j.results ?? []).filter((r: any) => r.error).length;
      setInviteMsg(`Sent ${ok} of ${selected.size}${fail ? `, ${fail} failed` : ""}. ${fail ? (j.results ?? []).filter((r: any)=>r.error).map((r:any)=> r.email+": "+r.error).slice(0,3).join(" | ") : ""}`);
      setSelected(new Set());
    }
  };
  const csv = () => {
    const head = ["full_name", "email", "phone", "team_name", "team_members", "created_at"];
    const esc = (v: any) => `"${String(Array.isArray(v) ? v.join("; ") : v ?? "").replace(/"/g, '""')}"`;
    const out = [head.join(","), ...rows.map((r) => head.map((h) => esc(r[h])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
    a.download = "registrations.csv";
    a.click();
  };
  return (
    <div className="glass p-4">
      <div className="flex justify-between items-center mb-3">
        <div><h2 className="font-semibold">Hackathon registrations ({rows.length})</h2><p className="text-xs text-muted">Select people and send them an automatic mail with their Exam Terminal link (copy/paste/screenshot/exit disqualifies — modal says You are disqualified).</p></div>
        <div className="flex gap-2"><button className="btn-primary !py-1 text-sm disabled:opacity-50" disabled={sending||selected.size===0} onClick={sendInvites}>{sending ? "Sending…" : `Send Exam Terminal link to ${selected.size || ""}`.trim()}</button><button className="btn-ghost !py-1 text-sm" onClick={csv}>Download CSV</button></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[40rem]">
          <thead><tr className="text-left text-muted"><th className="py-1"><input type="checkbox" checked={rows.length>0 && selected.size===rows.length} onChange={(e)=> setSelected(e.target.checked ? new Set(rows.map((r:any)=>r.email)) : new Set())} /> </th><th>Name</th><th>Email</th><th>Phone</th><th>Team</th><th>Members</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td><input type="checkbox" checked={selected.has(r.email)} onChange={()=> toggle(r.email)} /></td><td className="py-1">{r.full_name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.team_name}</td><td>{(r.team_members ?? []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {inviteMsg && <p className="text-xs text-teal mt-3">{inviteMsg}</p>}
    </div>
  );
}

export function AttendeesPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { sb().from("event_attendees").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  const csv = () => {
    const head = ["full_name", "email", "phone", "team_name", "team_members", "created_at"];
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


export function ExamPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [qRows, setQRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [newQ, setNewQ] = useState({ question: "", options: ["","","",""], answer: 0 });
  const load = () => {
    sb().from("exam_invites").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
    sb().from("exam_questions").select("*").order("id").then(({ data }) => setQRows(data ?? []));
  };
  useEffect(() => { load(); }, []);
  const csv = () => {
    const head = ["email","status","score","disqualified_reason","created_at","submitted_at"];
    const esc = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const out = [head.join(","), ...rows.map((r) => head.map((h) => esc(r[h])).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" })); a.download = "exam_invites.csv"; a.click();
  };
  return (
    <div className="grid gap-4">
      <div className="glass p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Exam Terminal — invites ({rows.length})</h2>
          <div className="flex gap-2">
            <button className="btn-ghost !py-1 text-sm" onClick={load}>Refresh</button>
            <button className="btn-ghost !py-1 text-sm" onClick={csv}>Download CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead><tr className="text-left text-muted"><th className="py-1">Email</th><th>Status</th><th>Score</th><th>Reason</th><th>Created</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-1 text-xs break-all">{r.email}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${r.status==="submitted"?"bg-[#F57F17] text-black": r.status==="disqualified"?"bg-white text-black": r.status==="started"?"bg-white/20":"bg-[#013216] border border-white/20"}`}>{r.status}</span></td>
                  <td>{r.score ?? "-"}</td>
                  <td className="text-xs">{r.disqualified_reason ?? "-"}</td>
                  <td className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {msg && <p className="text-xs text-teal mt-2">{msg}</p>}
      </div>

      <div className="glass p-4">
        <h3 className="font-semibold text-sm mb-2">Questions ({qRows.length ? `${qRows.length} / 50` : "50 placeholder (file)"})</h3>
        <p className="text-xs text-muted mb-3">{qRows.length ? "DB questions — exam will use these (shuffled per invite)." : "No DB questions yet — exam is using 50 placeholder questions from lib/examQuestions.ts (shuffled per invite). Add below or import real ones; when DB has 50, those take over."}</p>
        <div className="max-h-[20rem] overflow-y-auto divide-y divide-white/10 border border-white/10 rounded-xl">
          {qRows.map((qq: any) => (
            <div key={qq.id} className="p-2 text-xs">
              <b className="text-[#F57F17]">{qq.id}.</b> {qq.question}
              <div className="text-muted ml-4">{(qq.options ?? []).map((o: string, i: number) => <span key={i} className={qq.answer===i ? "text-white font-medium" : ""}>{String.fromCharCode(65+i)}. {o} </span>)}</div>
            </div>
          ))}
          {qRows.length===0 && <div className="p-3 text-xs text-muted">Showing 50 dummy questions from the placeholder file. Open any invite&apos;s <span className="text-white">Preview link</span> (<code className="text-white">?preview=1</code>) to see them, or add real questions below.</div>}
        </div>
        <div className="grid gap-2 mt-3">
          <input className="input text-sm" placeholder="Question text" value={newQ.question} onChange={(e) => setNewQ({ ...newQ, question: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            {[0,1,2,3].map((i) => (
              <input key={i} className="input text-sm" placeholder={`Option ${String.fromCharCode(65+i)}${newQ.answer===i ? " (correct)" : ""}`} value={newQ.options[i]} onChange={(e) => { const o=[...newQ.options]; o[i]=e.target.value; setNewQ({ ...newQ, options: o }); }} />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted">Correct:</span>
            <select className="input !w-auto text-sm" value={newQ.answer} onChange={(e) => setNewQ({ ...newQ, answer: Number(e.target.value) })}>
              <option value={0}>A</option><option value={1}>B</option><option value={2}>C</option><option value={3}>D</option>
            </select>
            <button className="btn-primary !py-1 text-sm" onClick={async () => {
              if (!newQ.question || newQ.options.some((o) => !o.trim())) { setMsg("Fill question and all 4 options"); return; }
              const nextId = (qRows.length ? Math.max(...qRows.map((r: any) => r.id)) : 0) + 1;
              const { error } = await sb().from("exam_questions").insert({ id: nextId, question: newQ.question, options: newQ.options, answer: newQ.answer });
              if (error) setMsg(error.message); else { setMsg("Added"); setNewQ({ question: "", options: ["","","",""], answer: 0 }); load(); }
            }}>Add question</button>
          </div>
        </div>
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
      <h2 className="font-semibold">Ticket check-in</h2>
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
