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
  const [regs, setRegs] = useState<Record<string,string>>({});
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [newQ, setNewQ] = useState({ question: "", options: ["","","",""], answer: 0 });
  const load = () => {
    sb().from("exam_invites").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
    sb().from("exam_questions").select("*").order("id").then(({ data }) => setQRows(data ?? []));
    sb().from("hackathon_registrations").select("email,full_name").then(({ data }) => {
      const m: Record<string,string> = {};
      (data ?? []).forEach((r:any)=> { m[String(r.email).toLowerCase()] = String(r.full_name||""); });
      setRegs(m);
    });
  };
  useEffect(() => { load(); }, []);
  const nameFor = (email:string) => regs[String(email).toLowerCase()] || "";
  const csv = () => {
    const head = ["name","email","status","score","disqualified_reason","created_at","submitted_at"];
    const esc = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const out = [head.join(","), ...rows.map((r) => {
      const name = nameFor(r.email);
      return head.map((h) => h==="name" ? esc(name) : esc(r[h])).join(",");
    })].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" })); a.download = "exam_results.csv"; a.click();
  };
  const qMap = new Map<number, any>();
  qRows.forEach((qq:any)=> qMap.set(Number(qq.id), qq));
  // fallback to placeholder list when DB empty cannot import server file here so build minimal map from qRows only
  // if DB empty detail view will show question numbers only

  const renderDetail = () => {
    if (!detail) return null;
    const answers: Record<string,number> = detail.answers ?? {};
    const entries = Object.entries(answers).sort((a,b)=> Number(a[0])-Number(b[0]));
    const score = detail.score ?? 0;
    const total = qRows.length || 50;
    const passed = score >= 20;
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={()=> setDetail(null)} />
        <div className="relative glass max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <div className="p-4 border-b border-white/10 flex justify-between items-start gap-3">
            <div>
              <div className="font-semibold text-sm">{nameFor(detail.email) ? nameFor(detail.email) + " " : ""}<span className="text-muted font-normal">{detail.email}</span></div>
              <div className="flex gap-2 items-center mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${detail.status==="submitted"?"bg-[#F57F17] text-black": detail.status==="disqualified"?"bg-red-500 text-white": detail.status==="started"?"bg-white/20":"bg-[#013216] border border-white/20"}`}>{detail.status}</span>
                <span className="text-sm font-bold">{score} of {total}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${passed?"bg-emerald text-black":"bg-red-500/20 text-red-300 border border-red-500/30"}`}>{passed ? "Passed" : "Below threshold"}</span>
              </div>
              {detail.disqualified_reason && <div className="text-xs text-red-300 mt-1">Reason {detail.disqualified_reason}</div>}
            </div>
            <button className="btn-ghost !py-1 text-sm" onClick={()=> setDetail(null)}>Close</button>
          </div>
          <div className="overflow-y-auto p-4 grid gap-3">
            {!entries.length && <div className="text-sm text-muted">No answers recorded for this invite yet. Invite not started or not submitted.</div>}
            {entries.map(([qid, chosen])=>{
              const id = Number(qid);
              const qq = qMap.get(id);
              const qtext = qq?.question ?? `Question ${id}`;
              const opts: string[] = qq?.options ?? [];
              const correct = qq?.answer;
              const isCorrect = correct !== undefined && Number(chosen) === Number(correct);
              return (
                <div key={qid} className={`rounded-xl border p-3 ${isCorrect?"border-emerald/30 bg-emerald/10":"border-white/10 bg-white/5"}`}>
                  <div className="text-xs font-medium"><span className="text-[#F57F17]">{id}.</span> {qtext}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                    {opts.length ? opts.map((o:string,i:number)=> {
                      const isChosen = Number(chosen)===i;
                      const isAnswer = Number(correct)===i;
                      return (
                        <div key={i} className={`text-xs px-2 py-1.5 rounded-lg border ${isChosen && isAnswer ? "bg-emerald text-black border-emerald font-medium" : isChosen && !isAnswer ? "bg-red-500 text-white border-red-500" : isAnswer ? "bg-[#F57F17]/20 border-[#F57F17]/40 text-white" : "bg-black/20 border-white/10 text-muted"}`}>
                          {String.fromCharCode(65+i)}. {o} {isChosen ? "  your choice" : ""}{isAnswer ? "  correct" : ""}
                        </div>
                      );
                    }) : (
                      <div className="text-xs text-muted">Chosen option {String.fromCharCode(65+Number(chosen))}  index {String(chosen)}</div>
                    )}
                  </div>
                  <div className="text-[11px] mt-1.5 flex gap-2">
                    <span className={isCorrect?"text-emerald":"text-red-300"}>{isCorrect ? "Correct" : "Not correct"}</span>
                    <span className="text-muted">Chosen {opts[Number(chosen)] ?? String.fromCharCode(65+Number(chosen))}  Correct {opts[Number(correct)] ?? (correct!==undefined? String.fromCharCode(65+Number(correct)):"unknown")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="glass p-4">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <div>
            <h2 className="font-semibold">Exam Results {rows.length ? ` ${rows.length} invites` : ""}</h2>
            <p className="text-xs text-muted">Scores and chosen options. Below 20 is auto disqualified and gets a mail. Invite mail uses the persons real name.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost !py-1 text-sm" onClick={load}>Refresh</button>
            <button className="btn-ghost !py-1 text-sm" onClick={csv}>Download CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[52rem]">
            <thead><tr className="text-left text-muted"><th className="py-1">Name</th><th>Email</th><th>Status</th><th>Score</th><th>Chosen Options</th><th>Reason</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const ans: Record<string,number> | null = r.answers;
                const preview = ans ? Object.entries(ans).slice(0,4).map(([k,v])=> `${k}:${String.fromCharCode(65+Number(v))}`).join(" ") + (Object.keys(ans).length>4 ? " ..." : "") : "";
                return (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-1 text-xs font-medium">{nameFor(r.email) || <span className="text-muted">no name yet</span>}</td>
                  <td className="py-1 text-xs break-all">{r.email}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${r.status==="submitted"?"bg-[#F57F17] text-black": r.status==="disqualified"?"bg-red-500 text-white": r.status==="started"?"bg-white/20":"bg-[#013216] border border-white/20"}`}>{r.status}</span></td>
                  <td><span className={`font-bold ${r.score!=null && r.score<20 ? "text-red-300" : ""}`}>{r.score ?? "not yet"}</span><span className="text-xs text-muted">{r.score!=null ? " of 50" : ""}</span></td>
                  <td className="text-xs font-mono max-w-[16rem] truncate" title={preview}>{preview || "not submitted"}</td>
                  <td className="text-xs max-w-[10rem] truncate" title={r.disqualified_reason||""}>{r.disqualified_reason ?? "ok"}</td>
                  <td className="text-xs text-muted">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "not yet"}</td>
                  <td><button className="px-3 py-1 rounded-full bg-white text-black text-xs disabled:opacity-40" disabled={!r.answers} onClick={()=> setDetail(r)}>View</button></td>
                </tr>
              )})}
              {!rows.length && <tr><td colSpan={8} className="py-8 text-center text-muted text-sm">No invites yet. Send invites from Registrations.</td></tr>}
            </tbody>
          </table>
        </div>
        {msg && <p className="text-xs text-teal mt-2">{msg}</p>}
      </div>

      <div className="glass p-4">
        <h3 className="font-semibold text-sm mb-2">Questions {qRows.length ? `${qRows.length} of 50` : "50 placeholder set active"}</h3>
        <p className="text-xs text-muted mb-3">{qRows.length ? "Database questions exam uses these shuffled per invite." : "No database questions yet exam uses 50 placeholder questions from code shuffled per invite. Add real questions below when you have 50 database rows they take over."}</p>
        <div className="max-h-[20rem] overflow-y-auto divide-y divide-white/10 border border-white/10 rounded-xl">
          {qRows.map((qq: any) => (
            <div key={qq.id} className="p-2 text-xs">
              <b className="text-[#F57F17]">{qq.id}.</b> {qq.question}
              <div className="text-muted ml-4">{(qq.options ?? []).map((o: string, i: number) => <span key={i} className={qq.answer===i ? "text-white font-medium" : ""}>{String.fromCharCode(65+i)}. {o} </span>)}</div>
            </div>
          ))}
          {qRows.length===0 && <div className="p-3 text-xs text-muted">Showing 50 dummy questions from the placeholder set. Preview any invite link with ?preview equals 1 to see them or add real questions below.</div>}
        </div>
        <div className="grid gap-2 mt-3">
          <input className="input text-sm" placeholder="Question text" value={newQ.question} onChange={(e) => setNewQ({ ...newQ, question: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            {[0,1,2,3].map((i) => (
              <input key={i} className="input text-sm" placeholder={`Option ${String.fromCharCode(65+i)}${newQ.answer===i ? " correct" : ""}`} value={newQ.options[i]} onChange={(e) => { const o=[...newQ.options]; o[i]=e.target.value; setNewQ({ ...newQ, options: o }); }} />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted">Correct</span>
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
      {detail && renderDetail()}
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
                <td className="font-mono text-xs font-bold text-[#F57F17] whitespace-nowrap">{r.total_naira ? formatNaira(r.total_naira) : "—"}</td>
                <td className="text-xs"><span className="font-mono">{r.account_number || "—"}</span><div className="text-muted text-[11px]">{r.bank_name || ""} {r.account_name || ""}</div></td>
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

