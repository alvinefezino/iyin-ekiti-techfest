"use client";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type Hacker = { id: string; full_name: string; email: string; phone: string; team_name: string; team_members: string[]; created_at: string; exam_status: string; exam_score: number | null; exam_passed: boolean | null; exam_reason: string | null };
type Attendee = { id: string; full_name: string; email: string; phone: string; team_name: string; team_members: string[]; created_at: string };

function Badge({ passed, status, score }: { passed: boolean | null; status: string; score: number | null }) {
  if (passed === true) return <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">Pass{score !== null ? ` · ${score}/50` : ""}</span>;
  if (passed === false) return <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">Fail{score !== null ? ` · ${score}/50` : status === "disqualified" ? " · disqualified" : ""}</span>;
  if (status === "started" || status === "invited") return <span className="inline-flex items-center rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-black">Invited{score !== null ? ` · ${score}/50` : ""}</span>;
  return <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] text-white/70">{status}</span>;
}

export default function TeamPage() {
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hackers, setHackers] = useState<Hacker[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [tab, setTab] = useState<"hackers" | "attendees">("hackers");
  const [filter, setFilter] = useState<"all" | "pass" | "fail">("all");

  async function load(nextQ: string, nextCode: string) {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextCode.trim()) params.set("code", nextCode.trim());
    const headers: Record<string, string> = {};
    if (nextCode.trim()) headers["x-team-code"] = nextCode.trim();
    const res = await fetch(`/api/team/directory?${params.toString()}`, { headers, cache: "no-store" });
    const j = await res.json().catch(() => ({} as any));
    if (res.status === 401) {
      setNeedCode(true);
      setErr(j.error || "Team code required. Ask admin for your team access code, or sign in as admin.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setErr(j.error || `Failed ${res.status}`);
      setLoading(false);
      return;
    }
    setNeedCode(false);
    setErr("");
    setHackers(j.hackers ?? []);
    setAttendees(j.attendees ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("team_code") || "" : "";
    if (saved) setCode(saved);
    load("", saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => load(q, code), 320);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filteredHackers = hackers.filter((h) => {
    if (filter === "pass") return h.exam_passed === true;
    if (filter === "fail") return h.exam_passed === false;
    return true;
  });

  const saveCodeAndReload = () => {
    sessionStorage.setItem("team_code", code.trim());
    load(q, code.trim());
  };

  const csv = (which: "hackers" | "attendees") => {
    const head = which === "hackers" ? ["full_name", "email", "phone", "team_name", "exam_status", "exam_score", "exam_passed", "created_at"] : ["full_name", "email", "phone", "team_name", "created_at"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = which === "hackers" ? filteredHackers : attendees;
    const out = [head.join(","), ...rows.map((r: any) => head.map((h) => esc(h === "exam_passed" ? (r[h] === true ? "pass" : r[h] === false ? "fail" : "") : r[h])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
    a.download = which === "hackers" ? "team_hackers.csv" : "team_attendees.csv";
    a.click();
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <a href="/" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE.logoWhite} alt="" width={28} height={28} className="h-7 w-7 rounded object-cover" />
          <span>{SITE.name}</span>
        </a>

        <div className="glass-strong mt-4 rounded-2xl p-4 sm:p-6">
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">Registration team — directory</h1>
          <p className="mt-1 text-sm text-muted">Search hackers and attendees by name or email. Hacker rows show exam pass or fail (20 of 50 to pass). Data updates automatically from registration and exam. Contact admin if your team code does not work.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="input min-w-[16rem] flex-1" />
            <button type="button" onClick={() => load(q, code)} className="btn-primary whitespace-nowrap">Search</button>
          </div>

          {needCode && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Team access code required</div>
              <p className="mt-1 text-xs opacity-80">Admin sets TEAM_CODE in env. Enter it once — saved for this browser tab. Admins signed in do not need it.</p>
              <div className="mt-2 flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter team code" className="input flex-1" onKeyDown={(e) => e.key === "Enter" && saveCodeAndReload()} />
                <button type="button" onClick={saveCodeAndReload} className="btn-primary">Unlock</button>
              </div>
              {err && <p className="mt-2 text-xs">{err}</p>}
            </div>
          )}

          {!needCode && (
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="flex rounded-full bg-black/10 p-1 text-xs">
                <button type="button" onClick={() => setTab("hackers")} className={`rounded-full px-3 py-1 font-medium ${tab === "hackers" ? "bg-white text-black" : "text-white/80"}`}>Hackers ({filteredHackers.length}{filter !== "all" ? ` filtered` : q ? ` · ${hackers.length} total` : ""})</button>
                <button type="button" onClick={() => setTab("attendees")} className={`rounded-full px-3 py-1 font-medium ${tab === "attendees" ? "bg-white text-black" : "text-white/80"}`}>Attendees ({attendees.length})</button>
              </div>
              {tab === "hackers" && (
                <div className="flex rounded-full bg-black/10 p-1 text-xs">
                  <button type="button" onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 ${filter === "all" ? "bg-[#F57F17] text-black" : "text-white/70"}`}>All</button>
                  <button type="button" onClick={() => setFilter("pass")} className={`rounded-full px-3 py-1 ${filter === "pass" ? "bg-emerald-500 text-white" : "text-white/70"}`}>Pass</button>
                  <button type="button" onClick={() => setFilter("fail")} className={`rounded-full px-3 py-1 ${filter === "fail" ? "bg-red-500 text-white" : "text-white/70"}`}>Fail</button>
                </div>
              )}
              <button type="button" onClick={() => csv(tab)} className="btn-ghost ml-auto !py-1 text-xs">Download {tab} CSV</button>
            </div>
          )}

          {!needCode && err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          {loading && !needCode && <p className="mt-6 text-sm text-muted">Loading…</p>}

          {!loading && !needCode && tab === "hackers" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-2 font-medium">Name</th>
                    <th className="font-medium">Email</th>
                    <th className="font-medium">Phone</th>
                    <th className="font-medium">Team</th>
                    <th className="font-medium">Exam</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHackers.map((h) => (
                    <tr key={h.id} className="border-t border-white/10 align-top">
                      <td className="py-2 pr-2 font-medium">{h.full_name}</td>
                      <td className="py-2 pr-2 break-all">{h.email}</td>
                      <td className="py-2 pr-2">{h.phone || "—"}</td>
                      <td className="py-2 pr-2">{h.team_name || "—"}</td>
                      <td className="py-2"><Badge passed={h.exam_passed} status={h.exam_status} score={h.exam_score} /></td>
                    </tr>
                  ))}
                  {filteredHackers.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted">{q || filter !== "all" ? "No matches. Try a different search or filter." : "No hackers yet."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !needCode && tab === "attendees" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-2 font-medium">Name</th>
                    <th className="font-medium">Email</th>
                    <th className="font-medium">Phone</th>
                    <th className="font-medium">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr key={a.id} className="border-t border-white/10 align-top">
                      <td className="py-2 pr-2 font-medium">{a.full_name}</td>
                      <td className="py-2 pr-2 break-all">{a.email}</td>
                      <td className="py-2 pr-2">{a.phone || "—"}</td>
                      <td className="py-2 pr-2">{a.team_name || "—"}</td>
                    </tr>
                  ))}
                  {attendees.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-muted">No attendees yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!needCode && (
            <p className="mt-4 text-[11px] leading-relaxed text-muted">Pass is 20 of 50. &quot;Fail&quot; includes disqualified and submitted below 20. &quot;Invited&quot; means they got a link but have not submitted. Directory refreshes on every search. Keep your team code private.</p>
          )}
        </div>
      </div>
    </main>
  );
}
