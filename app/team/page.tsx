"use client";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type Hacker = { id: string; full_name: string; email: string; phone: string; team_name: string; team_members: string[]; created_at: string };
type Attendee = { id: string; full_name: string; email: string; phone: string; team_name: string; team_members: string[]; created_at: string };

export default function TeamPage() {
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hackers, setHackers] = useState<Hacker[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [tab, setTab] = useState<"hackers" | "attendees">("hackers");

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

  useEffect(() => {
    const id = setTimeout(() => load(q, code), 320);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const saveCodeAndReload = () => {
    sessionStorage.setItem("team_code", code.trim());
    load(q, code.trim());
  };

  const csv = (which: "hackers" | "attendees") => {
    const head = ["full_name", "email", "phone", "team_name", "created_at"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = which === "hackers" ? hackers : attendees;
    const out = [head.join(","), ...rows.map((r: any) => head.map((h) => esc(r[h])).join(","))].join("\n");
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
          <p className="mt-1 text-sm text-muted">Search hackers and attendees by name or email. For check-in only — exam results are managed by admins.</p>

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
                <button type="button" onClick={() => setTab("hackers")} className={`rounded-full px-3 py-1 font-medium ${tab === "hackers" ? "bg-white text-black" : "text-white/80"}`}>Hackers ({hackers.length})</button>
                <button type="button" onClick={() => setTab("attendees")} className={`rounded-full px-3 py-1 font-medium ${tab === "attendees" ? "bg-white text-black" : "text-white/80"}`}>Attendees ({attendees.length})</button>
              </div>
              <button type="button" onClick={() => csv(tab)} className="btn-ghost ml-auto !py-1 text-xs">Download {tab} CSV</button>
            </div>
          )}

          {!needCode && err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          {loading && !needCode && <p className="mt-6 text-sm text-muted">Loading…</p>}

          {!loading && !needCode && tab === "hackers" && (
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
                  {hackers.map((h) => (
                    <tr key={h.id} className="border-t border-white/10 align-top">
                      <td className="py-2 pr-2 font-medium">{h.full_name}</td>
                      <td className="py-2 pr-2 break-all">{h.email}</td>
                      <td className="py-2 pr-2">{h.phone || "—"}</td>
                      <td className="py-2 pr-2">{h.team_name || "—"}</td>
                    </tr>
                  ))}
                  {hackers.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-muted">{q ? "No matches. Try a different search." : "No hackers yet."}</td></tr>
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
            <p className="mt-4 text-[11px] leading-relaxed text-muted">Directory refreshes on every search. Keep your team code private. Exam pass/fail is visible only in Admin → Exam panel.</p>
          )}
        </div>
      </div>
    </main>
  );
}
