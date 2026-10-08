"use client";
import { useEffect, useState } from "react";
import type { Block } from "@/lib/blocks";
import HeroBlock from "@/components/blocks/HeroBlock";
import { NewsletterForm, RegisterForm, TicketForm } from "@/components/Forms";

type Item = Record<string, string>;
const items = (b: Block): Item[] => (Array.isArray(b.props.items) ? b.props.items : []);

// --- Schedule helpers: parse "9:00 AM" -> minutes since midnight ---
function parseTimeMinutes(raw: string): number | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = (m[3] || "").replace(/\./g, "").toLowerCase();
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function ScheduleBlock({ heading, list, id }: { heading: string; list: Item[]; id: string }) {
  // client-only clock to avoid hydration mismatch: start as null, tick after mount
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const parsed = list.map((s) => parseTimeMinutes(s.time || ""));
  // active = the last item whose time <= now and (next time is null or now < next time)
  let activeIndex: number | null = null;
  if (nowMin !== null) {
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      if (cur === null) continue;
      const next = parsed.slice(i + 1).find((v) => v !== null) ?? null;
      if (nowMin >= cur && (next === null || nowMin < next)) {
        activeIndex = i;
        break;
      }
    }
    // before first event -> no active; after last event -> last stays active (until midnight)
  }

  return (
    <div className="section" id={id}>
      <h2>{heading}</h2>
      <ol className="border-l border-white/15 ml-2 grid gap-6">
        {list.map((s, i) => {
          const isActive = activeIndex === i;
          const isPast = activeIndex !== null && i < activeIndex;
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
              {/* circle tab — active is BIG, glowing, dual-halo */}
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
                  </>
                )}
                {isActive && (
                  <span className="relative w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] schedule-core" />
                )}
              </span>

              <div
                className={
                  "font-mono text-sm transition-colors flex flex-wrap items-center gap-2 " +
                  (isActive ? "text-teal font-extrabold drop-shadow-[0_0_8px_rgba(20,184,166,0.45)]" : isPast ? "text-teal/60" : "text-muted")
                }
              >
                <span>{s.time}</span>
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
                  (isActive
                    ? "text-[19px] leading-tight font-bold text-white drop-shadow-[0_1px_10px_rgba(20,184,166,0.25)]"
                    : isPast
                      ? "text-lg text-ink/60"
                      : "text-lg text-ink")
                }
              >
                {s.title}
              </div>
              <p className={"text-sm leading-relaxed mt-1 " + (isActive ? "text-white/80" : "text-muted")}>{s.body}</p>
              <Photo src={s.image} alt={s.title} className="mt-3 max-h-56 max-w-md" />
            </li>
          );
        })}
      </ol>
    </div>
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
              <Card key={i}>
                {s.image ? <Img src={s.image} alt={s.name} className="h-14 mx-auto object-contain" /> : <div className="text-center text-muted">{s.name}</div>}
              </Card>
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
  return <>{blocks.map((b) => <Render key={b.id} b={b} onHeroVisible={onHeroVisible} />)}</>;
}
