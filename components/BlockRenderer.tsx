"use client";
import type { Block } from "@/lib/blocks";
import HeroBlock from "@/components/blocks/HeroBlock";
import { NewsletterForm, RegisterForm, TicketForm } from "@/components/Forms";

type Item = Record<string, string>;
const items = (b: Block): Item[] => (Array.isArray(b.props.items) ? b.props.items : []);

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
      return (
        <div className="section" id={b.id}>
          <h2>{p.heading}</h2>
          <ol className="border-l border-white/20 ml-2 grid gap-6">
            {items(b).map((s, i) => (
              <li key={i} className="pl-6 relative">
                <span className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-teal" />
                <div className="font-mono text-sm text-teal">{s.time}</div>
                <div className="font-medium text-lg">{s.title}</div>
                <p className="text-muted text-sm">{s.body}</p>
                <Photo src={s.image} alt={s.title} className="mt-3 max-h-56 max-w-md" />
              </li>
            ))}
          </ol>
        </div>
      );
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
