"use client";
import { useEffect, useState, useRef, useCallback } from "react";

type Q = { id: number; question: string; options: string[] };
type Invite = { id: string; email: string; status: string; expires_at: string | null; score?: number | null; disqualified_reason?: string | null };

function XIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r="26" fill="none" stroke="#F57F17" strokeWidth="2" />
      <path d="M18 18 L38 38 M38 18 L18 38" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function ExamTerminal({ token, preview }: { token: string; preview?: boolean }) {
  const isPreview = !!preview;
  const [invite, setInvite] = useState<Invite | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);
  const [disqualified, setDisqualified] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 min for 50 Q
  const disqualifiedRef = useRef(false);
  const submittedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr("");
    const res = await fetch(`/api/exam/${token}`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error ?? "Failed to load exam"); setLoading(false); return; }
    setInvite(j.invite);
    setQuestions(j.questions ?? []);
    if (j.invite?.status === "disqualified") setDisqualified(j.invite.disqualified_reason ?? "violation");
    if (j.invite?.status === "submitted") setSubmitted({ score: j.invite.score ?? 0, total: 50 });
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doDisqualify = useCallback(async (reason: string) => {
    if (disqualifiedRef.current || submittedRef.current) return;
    disqualifiedRef.current = true;
    setDisqualified(reason);
    try { await fetch("/api/exam/disqualify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, reason }) }); } catch {}
  }, [token]);

  const startExam = useCallback(async () => {
    const res = await fetch("/api/exam/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error ?? "Cannot start"); return; }
    setStarted(true);
    // try fullscreen
    if (!isPreview) try { await document.documentElement.requestFullscreen?.(); } catch {}
  }, [token]);

  // Timer
  useEffect(() => {
    if (isPreview || !started || disqualified || submitted || loading) return;
    const id = setInterval(() => setTimeLeft((t) => {
      if (t <= 1) { clearInterval(id); handleSubmit(); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [started, disqualified, submitted, loading]);

  // Lockdown listeners
  useEffect(() => {
    if (isPreview) return;
    if (!started || disqualified || submitted) return;

    const block = (e: Event, reason: string) => { e.preventDefault(); doDisqualify(reason); };

    const onCopy = (e: ClipboardEvent) => block(e, "copy");
    const onCut = (e: ClipboardEvent) => block(e, "cut");
    const onPaste = (e: ClipboardEvent) => block(e, "paste");
    const onContext = (e: MouseEvent) => block(e, "copy");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") { e.preventDefault(); doDisqualify("screenshot"); return; }
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c","v","x","a","s","p"].includes(k)) { e.preventDefault(); doDisqualify(k === "p" ? "screenshot" : "copy"); }
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i","j","c"].includes(k))) { e.preventDefault(); doDisqualify("copy"); }
    };

    const onVisibility = () => { if (document.hidden) doDisqualify("exit"); };
    const onBlur = () => doDisqualify("exit");
    const onBeforeUnload = (e: BeforeUnloadEvent) => { doDisqualify("exit"); e.preventDefault(); e.returnValue = ""; };
    const onFullscreen = () => { if (!document.fullscreenElement) doDisqualify("exit"); };
    const onDrag = (e: DragEvent) => e.preventDefault();

    document.addEventListener("copy", onCopy as any);
    document.addEventListener("cut", onCut as any);
    document.addEventListener("paste", onPaste as any);
    document.addEventListener("contextmenu", onContext as any);
    document.addEventListener("keydown", onKeyDown as any);
    document.addEventListener("dragstart", onDrag as any);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("copy", onCopy as any);
      document.removeEventListener("cut", onCut as any);
      document.removeEventListener("paste", onPaste as any);
      document.removeEventListener("contextmenu", onContext as any);
      document.removeEventListener("keydown", onKeyDown as any);
      document.removeEventListener("dragstart", onDrag as any);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [started, disqualified, submitted, doDisqualify]);

  const handleSubmit = async () => {
    if (submittedRef.current || disqualifiedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const res = await fetch("/api/exam/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, answers }) });
    const j = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) { submittedRef.current = false; setErr(j.error ?? "Submit failed"); return; }
    setSubmitted({ score: j.score, total: j.total });
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#013216] text-white">Loading Exam Terminal...</div>;
  if (err) return <div className="min-h-screen grid place-items-center bg-[#013216] text-white p-6 text-center"><div><p className="text-[#F57F17] font-semibold">{err}</p><p className="text-white/60 text-sm mt-2">Check your link or contact FIESU.</p></div></div>;
  if (disqualified) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#000000]/80 backdrop-blur p-4">
        <div className="bg-[#013216] border border-[#F57F17] rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="flex justify-center mb-4"><XIcon /></div>
          <h2 className="text-white text-xl font-semibold">You are disqualified</h2>
          <p className="text-white/60 text-sm mt-2">Reason: {disqualified}. The Exam Terminal is now locked. Contact FIESU if this was a mistake.</p>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#013216] text-white p-6">
        <div className="bg-black border border-[#F57F17] rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold">Submitted</h2>
          <p className="text-[#F57F17] text-4xl font-bold mt-3">{submitted.score} / {submitted.total}</p>
          <p className="text-white/60 text-sm mt-2">Your answers have been recorded. FIESU will be in touch.</p>
        </div>
      </div>
    );
  }
  if (!started) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#013216] text-white p-6">
        {isPreview && <div className="fixed top-0 inset-x-0 z-20 bg-amber-400 text-black text-xs font-semibold text-center py-2">Preview mode — no timer, no disqualification. Open the real link to start the 20-minute timed exam.</div>}
        <div className="bg-black border border-[#F57F17]/30 rounded-2xl p-8 max-w-lg w-full">
          <h1 className="text-2xl font-semibold">Exam Terminal</h1>
          <p className="text-white/70 text-sm mt-2">You are about to enter the FIESU Exam Terminal. 50 questions, 20 minutes.</p>
          <ul className="text-sm text-white/60 list-disc pl-5 mt-4 space-y-1">
            <li>Do not copy, paste, screenshot, or leave the terminal.</li>
            <li>Switching tabs, minimizing, or exiting fullscreen will disqualify you.</li>
            <li>Right-click and keyboard shortcuts are disabled.</li>
            <li>One attempt only. Your answers auto-submit when time runs out.</li>
          </ul>
          <p className="text-xs text-white/50 mt-4">Signed in as {invite?.email}</p>
          <button onClick={startExam} className="mt-6 w-full bg-[#F57F17] text-black font-semibold py-3 rounded-full hover:bg-[#F57F17]/90">Enter fullscreen and start</button>
          <p className="text-xs text-white/40 mt-3 text-center">Powered by FIESU</p>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#013216] text-white select-none" style={{ userSelect: "none" as any, WebkitUserSelect: "none" as any }} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onPaste={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      {isPreview && <div className="bg-amber-400 text-black text-xs font-semibold text-center py-2 px-4">Preview mode — answers are not saved and anti-cheat is off. Close preview and open the real link for the timed 20-minute exam.</div>}
      <header className="sticky top-0 z-10 bg-black border-b border-[#F57F17]/20 px-4 py-3 flex items-center justify-between">
        <b className="text-sm tracking-wide">FIESU Exam Terminal{isPreview ? " — Preview" : ""}</b>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm bg-[#F57F17] text-black px-3 py-1 rounded-full">{mm}:{ss}</span>
          <span className="text-xs text-white/60 hidden sm:block">{current + 1} / 50</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="bg-black border border-white/10 rounded-2xl p-5 md:p-6">
          <div className="text-xs text-[#F57F17] font-mono">Question {current + 1} of 50</div>
          <h2 className="text-lg font-medium mt-2 leading-relaxed">{q?.question}</h2>
          <div className="grid gap-2 mt-5">
            {q?.options.map((opt, i) => (
              <button key={i} onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className={`text-left px-4 py-3 rounded-xl border text-sm ${answers[q.id] === i ? "bg-[#F57F17] text-black border-[#F57F17]" : "bg-white/5 border-white/10 hover:bg-white/10 text-white"}`}>
                <span className="font-mono mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 gap-2">
          <button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="px-4 py-2 rounded-full border border-white/20 text-sm disabled:opacity-30">Previous</button>
          <div className="flex gap-2">
            {current < 49 ? (
              <button onClick={() => setCurrent((c) => c + 1)} className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium">Next</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 rounded-full bg-[#F57F17] text-black text-sm font-semibold disabled:opacity-50">{submitting ? "Submitting..." : "Submit"}</button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-10 gap-1.5">
          {questions.map((qq, idx) => (
            <button key={qq.id} onClick={() => setCurrent(idx)} className={`h-8 rounded-lg text-xs font-mono border ${idx === current ? "border-[#F57F17] bg-[#F57F17] text-black" : answers[qq.id] !== undefined ? "bg-white text-black border-white" : "bg-white/10 border-white/10 text-white/60"}`}>{idx + 1}</button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-4 text-center">FIESU — copying, screenshots, or leaving this terminal will disqualify you.</p>
      </div>
    </div>
  );
}
