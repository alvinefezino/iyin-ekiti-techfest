"use client";
import { useEffect, useState } from "react";
import { resolveSlugs, type Block } from "@/lib/blocks";
import HeroBlock from "@/components/blocks/HeroBlock";
import { useEventDate } from "@/hooks/useCountdown";
import { NewsletterForm, RegisterForm, AttendeesForm, TicketForm } from "@/components/Forms";

type Item = Record<string, string>;
const items = (b: Block): Item[] => (Array.isArray(b.props.items) ? b.props.items : []);

// --- Schedule helpers ---
function parseHM(raw?: string): number | null {
  const m = (raw || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = +m[1], min = +m[2];
  return h > 23 || min > 59 ? null : h * 60 + min;
}
// "9:00 AM", "9am", "14:30" -> minutes since midnight (fallback for older saved content)
function parseTimeMinutes(raw: string): number | null {
  const hm = parseHM(raw);
  if (hm !== null && !/[ap]\.?m/i.test(raw)) return hm;
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = (m[3] || "").replace(/\./g, "").toLowerCase();
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
const fmt12 = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
function until(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

function ScheduleBlock({ heading, list, id }: { heading: string; list: Item[]; id: string }) {
  const eventDate = useEventDate();
  // client-only clock to avoid hydration mismatch: null until mounted, then ticks every second
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Session times are Nigeria time (WAT, UTC+1) on the event day
  const day = (eventDate || "").slice(0, 10);
  const at = (mins: number) => Date.parse(`${day}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00+01:00`);
  const starts = list.map((s) => parseHM(s.start) ?? parseTimeMinutes(s.time || ""));
  const ranges = list.map((s, i) => {
    const st = starts[i];
    if (st === null || !day) return null;
    const nextStart = starts.slice(i + 1).find((v) => v !== null && v > st) ?? null;
    const en = parseHM(s.end) ?? nextStart ?? st + 60;
    return { start: at(st), end: at(en), label: `${fmt12(st)} to ${fmt12(en)}` };
  });
  const state = (i: number): "live" | "upcoming" | "done" | "unknown" => {
    const r = ranges[i];
    if (!r || now === null) return "unknown";
    if (now >= r.end) return "done";
    if (now >= r.start) return "live";
    return "upcoming";
  };
  const nextUp = now === null ? -1 : list.findIndex((_, i) => state(i) === "upcoming");

  return (
    <div className="section" id={id}>
      <h2>{heading}</h2>
      <ol className="border-l border-white/15 ml-2 grid gap-6">
        {list.map((s, i) => {
          const st = state(i);
          const isActive = st === "live";
          const isPast = st === "done";
          const r = ranges[i];
          return (
            <li
              key={i}
              className={
                "pl-6 relative rounded-xl transition-all duration-300 " +
                (isActive
                  ? "py-4 -my-1 bg-teal/[0.09] border border-teal/25 shadow-[0_0_0_1px_rgba(20,184,166,0.18),0_8px_28px_rgba(20,184,166,0.18)]"
                  : "py-1 border border-transparent")
              }
            >
              <span
                aria-hidden
                className={
                  "absolute grid place-items-center rounded-full transition-all duration-300 " +
                  (isActive
                    ? "-left-[10px] top-[22px] w-5 h-5 bg-teal border-[3px] border-white shadow-[0_0_0_4px_rgba(20,184,166,0.35),0_0_18px_rgba(20,184,166,0.95),0_0_36px_rgba(20,184,166,0.55)]"
                    : isPast
                      ? "-left-[7px] top-1.5 w-3 h-3 bg-teal/30 border-2 border-teal/45"
                      : "-left-[7px] top-1.5 w-3 h-3 bg-white/10 border-2 border-white/25")
                }
              >
                {isActive && (
                  <>
                    <span className="absolute inset-[-10px] rounded-full bg-teal/35 schedule-pulse pointer-events-none" />
                    <span className="absolute inset-[-16px] rounded-full border border-teal/25 bg-teal/[0.08] schedule-pulse-2 pointer-events-none" />
                    <span className="absolute inset-[-3px] rounded-full bg-white/20 blur-[2px] pointer-events-none" />
                    <span className="relative w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] schedule-core" />
                  </>
                )}
              </span>

              <div
                className={
                  "font-mono text-sm transition-colors flex flex-wrap items-center gap-2 " +
                  (isActive ? "text-teal font-extrabold drop-shadow-[0_0_8px_rgba(20,184,166,0.45)]" : isPast ? "text-teal/60" : "text-muted")
                }
              >
                <span>{s.time || r?.label || ""}</span>
                {isActive && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase px-2.5 py-1 rounded-full bg-teal text-bg font-sans font-black shadow-[0_0_14px_rgba(20,184,166,0.7),0_0_28px_rgba(20,184,166,0.4)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div
                className={
                  "font-medium transition-colors mt-0.5 " +
                  (isActive ? "text-[19px] leading-tight font-bold text-white" : isPast ? "text-lg text-ink/60" : "text-lg text-ink")
                }
              >
                {s.title}
              </div>

              {/* time-sensitive status line */}
              {isActive && (
                <p className="mt-1.5 text-base font-semibold text-teal drop-shadow-[0_0_10px_rgba(20,184,166,0.35)]" aria-live="polite">
                  {s.liveText || `${s.title} is live`}
                  {r && <span className="ml-2 font-mono text-xs font-normal text-white/60">ends in {until(r.end - (now ?? 0))}</span>}
                </p>
              )}
              {st === "upcoming" && i === nextUp && r && now !== null && (
                <p className="mt-1 text-sm text-accent font-mono">Up next · starts in {until(r.start - now)}</p>
              )}
              {isPast && <p className="mt-1 text-xs text-teal/60 font-mono">Done</p>}

              <p className={"text-sm leading-relaxed mt-1 " + (isActive ? "text-white/80" : "text-muted")}>{s.body}</p>
              <Photo src={s.image} alt={s.title} className="mt-3 max-h-56 max-w-md" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}


function SponsorPromoCard({ s }: { s: Item }) {
  const highlighted = s.highlight === "1" || s.highlight === "true" || (s as any).highlight === true;
  const promoEnabled = s.promoEnabled === "1" || s.promoEnabled === "true" || (s as any).promoEnabled === true;
  const active = highlighted || promoEnabled;
  const promoCode = (s.promoCode || "IYINTECHFEST").trim() || "IYINTECHFEST";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [refId, setRefId] = useState("");
  const [phase, setPhase] = useState<"idle" | "verifying" | "done">("idle");
  const [msg, setMsg] = useState("");

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(promoCode); } catch { const ta=document.createElement("textarea"); ta.value=promoCode; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    setCopied(true);
    setTimeout(() => setShowPay(true), 350);
  };

  const completePayment = async () => {
    if (!refId.trim()) { setMsg("Enter your Reference ID"); return; }
    setMsg("");
    setPhase("verifying");
    try {
      const res = await fetch("/api/sponsor-promo", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sponsor_name: s.name || "Sponsor", promo_code: promoCode, bank_name: s.bankName || "", account_number: s.accountNumber || "", account_name: s.accountName || "", reference_id: refId.trim() }) });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j.error || "Could not save. Try again.");
      setPhase("done");
      setTimeout(()=>{ setShowPay(false); setOpen(false); setCopied(false); setPhase("idle"); setRefId(""); setMsg(""); }, 1600);
    } catch (e:any) {
      setPhase("idle");
      setMsg(e.message || "Failed");
    }
  };

  return (
    <>
      <div
        className={"relative " + (highlighted ? "sponsor-highlight" : "") + (active ? " cursor-pointer" : "")}
        onClick={() => { if (active) { setOpen((v)=>!v); if(open){ setCopied(false); } } }}
        role={active ? "button" : undefined}
        tabIndex={active ? 0 : undefined}
        onKeyDown={(e)=>{ if(active && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); setOpen(v=>!v); } }}
        aria-expanded={active ? open : undefined}
      >
        {highlighted && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none select-none" aria-hidden>
            <span className="whitespace-nowrap text-[10px] tracking-[0.14em] uppercase font-black px-2.5 py-1 rounded-full bg-[#F57F17] text-white shadow-[0_4px_16px_rgba(245,127,23,0.5)] border border-white/20">
              {s.badge?.trim() || "Food sponsor"}
            </span>
            <svg width="14" height="28" viewBox="0 0 14 28" fill="none" className="sponsor-arrow -mt-px drop-shadow-[0_2px_8px_rgba(245,127,23,0.6)]" aria-hidden>
              <path d="M7 0V20" stroke="#F57F17" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M7 26L2.2 17H11.8L7 26Z" fill="#F57F17" />
            </svg>
          </div>
        )}
        <Card>
          <div className={"grid gap-2 place-items-center py-2 transition-all rounded-xl " + (highlighted ? "pt-7 ring-1 ring-[#F57F17]/30" : "") + (active && open ? " ring-2 ring-[#F57F17]/50" : "")}>
            {s.image ? <Img src={s.image} alt={s.name} className="h-14 object-contain" /> : null}
            <div className="text-center text-sm font-medium">{s.name || "Sponsor"}</div>
            {active && <span className="text-[11px] text-[#F57F17] font-semibold hidden md:inline-flex items-center gap-1.5">Tap to get promo <span className="w-5 h-px bg-[#F57F17] inline-block" />→</span>}
          </div>
        </Card>

        {active && open && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] z-20 w-[min(300px,88vw)] promo-in"
            onClick={(e)=>e.stopPropagation()}
          >
            <div className="rounded-xl bg-[#0a2a12] border border-[#F57F17]/40 shadow-[0_10px_30px_rgba(245,127,23,0.35),0_4px_12px_rgba(0,0,0,0.45)] overflow-hidden">
              <div className="h-1 bg-[#F57F17]" />
              <div className="p-3.5">
                <div className="text-[11px] tracking-[0.12em] uppercase text-white/60 font-semibold">Promo Code</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono font-black text-[#F57F17] text-[15px] tracking-wide break-all">IYINTECHFEST</span>
                  <span className="text-white/25">·</span>
                  <span className="font-mono text-sm text-white">{promoCode !== "IYINTECHFEST" ? promoCode : ""}</span>
                  <button
                    onClick={handleCopy}
                    className={"ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 " + (copied ? "bg-white text-[#013216]" : "bg-[#F57F17] text-white hover:bg-[#ff8c1a]")}
                    aria-label="Copy promo code"
                  >
                    {copied ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg> Copied</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v3"/></svg> Copy</>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-white/50 mt-1">Promo Code: <b className="text-white font-mono">{promoCode}</b></div>
                {copied && <p className="text-xs text-[#F57F17] mt-2 font-medium">Copied! Continuing to payment…</p>}
              </div>
            </div>
            <div className="mx-auto -mt-px w-3 h-3 rotate-45 bg-[#0a2a12] border-l border-t border-[#F57F17]/40 -translate-y-[7px]" aria-hidden />
          </div>
        )}
      </div>

      {showPay && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={()=> phase==="idle" && setShowPay(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0a2a12] border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden promo-in" onClick={(e)=>e.stopPropagation()}>
            <div className="h-1 bg-[#F57F17]" />
            <div className="p-5">
              {phase==="done" ? (
                <div className="grid place-items-center py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F57F17] grid place-items-center" style={{animation:"verify-pop 0.35s ease-out"}}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" style={{strokeDasharray:24, animation:"verify-draw 0.45s ease-out 0.15s both"}} /></svg>
                  </div>
                  <p className="mt-3 font-semibold">Payment submitted</p>
                  <p className="text-sm text-white/60">We are verifying your Reference ID.</p>
                </div>
              ) : phase==="verifying" ? (
                <div className="grid place-items-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-[#F57F17]/30 border-t-[#F57F17]" style={{animation:"verify-spin 0.9s linear infinite"}} />
                  <p className="mt-4 font-semibold text-[#F57F17]">Verifying…</p>
                  <p className="text-xs text-white/60 mt-1">Checking Reference ID {refId}</p>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-lg leading-tight">Complete payment for {s.name || "Sponsor"}</h3>
                  <p className="text-sm text-white/60 mt-1">Use the account below. Enter your bank Reference ID to confirm.</p>
                  <div className="mt-4 grid gap-3 rounded-xl bg-white/[0.06] border border-white/10 p-3.5">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><div className="text-[11px] tracking-widest uppercase text-white/50">Bank</div><div className="font-medium">{s.bankName || "—"}</div></div>
                      <div><div className="text-[11px] tracking-widest uppercase text-white/50">Account name</div><div className="font-medium break-all">{s.accountName || "—"}</div></div>
                    </div>
                    <div><div className="text-[11px] tracking-widest uppercase text-white/50">Account number</div><div className="font-mono text-lg font-bold tracking-wide">{s.accountNumber || "—"}</div></div>
                    <div className="text-xs text-white/50">Promo code applied: <b className="text-[#F57F17] font-mono">{promoCode}</b></div>
                  </div>
                  <label className="block mt-4 text-sm">
                    <span className="text-xs font-semibold tracking-wide uppercase text-white/70">Reference ID</span>
                    <input className="input mt-1.5 focus:border-[#F57F17]" placeholder="e.g. 1234567890" value={refId} onChange={(e)=>setRefId(e.target.value)} />
                  </label>
                  {msg && <p className="text-xs text-red-300 mt-2">{msg}</p>}
                  <div className="mt-4 flex gap-2">
                    <button className="btn-ghost flex-1" onClick={()=>setShowPay(false)}>Cancel</button>
                    <button className="btn-primary flex-1 !bg-[#F57F17] hover:!bg-[#ff8c1a]" onClick={completePayment}>Complete payment</button>
                  </div>
                  <p className="text-[11px] text-white/40 text-center mt-3">Payments are verified by admin.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass p-5">{children}</div>;
}

function Avatar({ src, name }: { src?: string; name?: string }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={name || ""} className="w-full aspect-square object-cover rounded-xl mb-3" />
    : <div className="w-full aspect-square rounded-xl mb-3 grid place-items-center bg-emerald/30 text-3xl font-semibold text-teal">{initials}</div>;
}

function Photo({ src, alt, className = "" }: { src?: string; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt || ""} className={`w-full object-cover rounded-xl ${className}`} /> : null;
}

function Img({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt || ""} className={className} /> : <div className={`${className} bg-white/10`} />;
}

function Render({ b, onHeroVisible }: { b: Block; onHeroVisible?: (v: boolean) => void }) {
  const p = b.props;
  switch (b.type) {
    case "hero":
      return <HeroBlock props={p} onVisible={onHeroVisible} />;
    case "about":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <p className="text-muted max-w-2xl leading-relaxed">{p.body}</p>
          <Photo src={p.image} alt={p.heading} className="mt-6 max-h-96" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {items(b).map((s, i) => (
              <Card key={i}>
                <div className="text-3xl font-semibold text-teal font-mono">{s.value}</div>
                <div className="text-muted text-sm mt-1">{s.label}</div>
              </Card>
            ))}
          </div>
        </div>
      );
    case "tracks":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {items(b).map((t, i) => (
              <Card key={i}>
                <Photo src={t.image} alt={t.title} className="aspect-video mb-3" />
                <h3 className="font-medium text-lg">{t.title}</h3>
                <p className="text-muted mt-2 text-sm">{t.body}</p>
              </Card>
            ))}
          </div>
        </div>
      );
    case "schedule":
      return <ScheduleBlock heading={p.heading} list={items(b)} id={b.id} />;
    case "prizes":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {items(b).map((x, i) => (
              <Card key={i}>
                <Photo src={x.image} alt={x.place} className="aspect-video mb-3" />
                <div className="text-accent font-medium">{x.place}</div>
                <div className="text-xl mt-2">{x.prize}</div>
              </Card>
            ))}
          </div>
        </div>
      );
    case "speakers":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items(b).map((s, i) => (
              <Card key={i}>
                <Avatar src={s.image} name={s.name} />
                <div className="font-medium">{s.name}</div>
                <div className="text-muted text-sm">{s.role}</div>
              </Card>
            ))}
          </div>
        </div>
      );
    case "sponsors":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items(b).map((s, i) => (
              <SponsorPromoCard key={i} s={s} />
            ))}
          </div>
        </div>
      );
    case "faq":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <div className="grid gap-3 max-w-3xl">
            {items(b).map((f, i) => (
              <details key={i} className="glass p-4 group">
                <summary className="cursor-pointer font-medium list-none flex justify-between">{f.q}<span className="text-teal group-open:rotate-45 transition-transform">+</span></summary>
                <p className="text-muted mt-2 text-sm">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      );
    case "register":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <p className="text-muted mb-5 max-w-xl">{p.body}</p>
          <RegisterForm />
        </div>
      );
    case "attendees":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <p className="text-muted mb-5 max-w-xl">{p.body}</p>
          <AttendeesForm />
        </div>
      );
    case "tickets":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <p className="text-muted mb-5 max-w-xl">{p.body}</p>
          <TicketForm name={p.name} price={Number(p.price) || 0} />
        </div>
      );
    case "newsletter":
      return (
        <div className="section" id={b.id}>
          <div className="glass-strong p-6 md:p-10">
            <h2>{p.heading}</h2>
            <p className="text-muted mb-5">{p.body}</p>
            <NewsletterForm />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <p className="text-muted max-w-2xl whitespace-pre-line leading-relaxed">{p.body}</p>
          <Photo src={p.image} alt={p.heading} className="mt-6 max-h-96" />
        </div>
      );
    case "image":
      return (
        <figure className="section" id={b.id}>
          <Img src={p.src} alt={p.alt} className="w-full rounded-2xl max-h-[32rem] object-cover" />
          {p.caption && <figcaption className="text-muted text-sm mt-2">{p.caption}</figcaption>}
        </figure>
      );
    case "cta":
      return (
        <div className="section" id={b.id}>
          <div className="glass-strong p-8 text-center">
            <h2>{p.heading}</h2>
            <p className="text-muted mb-5">{p.body}</p>
            <a className="btn-primary" href={p.href}>{p.label}</a>
          </div>
        </div>
      );
    case "footer":
      return (
        <footer className="px-5 py-10 pb-28 border-t border-white/10 text-center text-sm text-muted" id={b.id}>
          <p>{p.text}</p>
          <div className="flex justify-center gap-4 mt-3">
            {items(b).map((l, i) => <a key={i} href={l.href} className="hover:text-ink">{l.label}</a>)}
          </div>
        </footer>
      );
    default:
      return null;
  }
}

export default function BlockRenderer({ blocks, onHeroVisible }: { blocks: Block[]; onHeroVisible?: (v: boolean) => void }) {
  const slugs = resolveSlugs(blocks);
  return <>{blocks.map((b) => <Render key={b.id} b={{ ...b, id: slugs[b.id] }} onHeroVisible={onHeroVisible} />)}</>;
}
