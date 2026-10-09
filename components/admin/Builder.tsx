"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BLOCK_DEFS, DEFAULT_BLOCKS, newBlock, resolveSlugs, type Block, type BlockType, type Field } from "@/lib/blocks";
import { SITE } from "@/lib/site";

type Sub = { key: string; label: string; kind: "text" | "textarea" | "image" | "time" };

function Leaf({ f, value, onChange }: { f: Sub | Field; value: string; onChange: (v: string) => void }) {
  const [up, setUp] = useState(false);
  const [err, setErr] = useState("");
  if (f.kind === "time") return <input className="input" type="time" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  if (f.kind === "textarea") return <textarea className="input" rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  if (f.kind === "image")
    return (
      <div className="grid gap-2">
        <div className="flex items-center gap-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/20" />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-dashed border-white/30 grid place-items-center text-[10px] text-muted text-center">No photo</div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="btn-primary !px-3 !py-1.5 text-sm">
              {up ? "Uploading…" : value ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" hidden disabled={up} onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setErr("");
                if (!file.type.startsWith("image/")) return setErr("Choose an image file.");
                if (file.size > 5 * 1024 * 1024) return setErr("Image is over 5 MB. Use a smaller one.");
                setUp(true);
                const sb = supabaseBrowser();
                const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
                const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type });
                if (error) setErr(`Upload failed: ${error.message}`);
                else onChange(sb.storage.from("media").getPublicUrl(path).data.publicUrl);
                setUp(false);
              }} />
            </label>
            {value && <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm text-countdown" onClick={() => onChange("")}>Remove</button>}
          </div>
        </div>
        <input className="input !py-1.5 text-xs" placeholder="or paste an image link" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        {err && <p className="text-xs text-countdown">{err}</p>}
      </div>
    );
  return <input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

function BlockEditor({ b, autoSlug, onChange, onMeta }: { b: Block; autoSlug: string; onChange: (p: Record<string, any>) => void; onMeta: (patch: Partial<Block>) => void }) {
  const def = BLOCK_DEFS[b.type];
  const set = (k: string, v: any) => onChange({ ...b.props, [k]: v });
  return (
    <div className="grid gap-3 pt-3">
      <div className="bg-white/5 rounded-xl p-3 grid gap-2 border border-white/10">
        <div>
          <div className="text-xs text-muted mb-1">Section name (admin list, navbar and link)</div>
          <input className="input" placeholder={def.label} value={b.name ?? ""} onChange={(e) => onMeta({ name: e.target.value })} />
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Link (URL) · live at <span className="font-mono text-teal">/{autoSlug}</span></div>
          <input className="input font-mono text-sm" placeholder="auto from the name" value={b.slug ?? ""} onChange={(e) => onMeta({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })} />
        </div>
        <label className="text-xs text-muted flex items-center gap-2">
          <input type="checkbox" checked={b.showInNav ?? !!def.nav} onChange={(e) => onMeta({ showInNav: e.target.checked })} />
          Show in the navbar
        </label>
      </div>
      {def.fields.map((f) => (
        <div key={f.key}>
          <div className="text-xs text-muted mb-1">{f.label}</div>
          {f.kind === "items" ? (
            <div className="grid gap-2">
              {(b.props[f.key] ?? []).map((it: Record<string, string>, i: number) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 grid gap-2 border border-white/10">
                  {f.fields.map((sf) => (
                    <div key={sf.key}>
                      <div className="text-[11px] text-muted">{sf.label}</div>
                      <Leaf f={sf} value={it[sf.key]} onChange={(v) => {
                        const arr = [...b.props[f.key]];
                        arr[i] = { ...arr[i], [sf.key]: v };
                        set(f.key, arr);
                      }} />
                    </div>
                  ))}
                  <div className="flex gap-2 text-xs">
                    <button className="btn-ghost !px-2 !py-0.5" onClick={() => { const a = [...b.props[f.key]]; if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; set(f.key, a); } }}>Up</button>
                    <button className="btn-ghost !px-2 !py-0.5" onClick={() => { const a = [...b.props[f.key]]; if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; set(f.key, a); } }}>Down</button>
                    <button className="btn-ghost !px-2 !py-0.5 text-countdown" onClick={() => set(f.key, b.props[f.key].filter((_: any, j: number) => j !== i))}>Remove</button>
                  </div>
                </div>
              ))}
              <button className="btn-ghost !py-1 text-sm" onClick={() => set(f.key, [...(b.props[f.key] ?? []), Object.fromEntries(f.fields.map((x) => [x.key, ""]))])}>Add item</button>
            </div>
          ) : (
            <Leaf f={f} value={b.props[f.key]} onChange={(v) => set(f.key, v)} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Builder() {
  const sb = supabaseBrowser();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [eventDate, setEventDate] = useState(SITE.eventDate);
  const [open, setOpen] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>("text");
  const [status, setStatus] = useState("");
  const [notify, setNotify] = useState(false);
  const [device, setDevice] = useState<"phone" | "tablet" | "desktop">("desktop");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [versions, setVersions] = useState<{ id: number; created_at: string; blocks: Block[] }[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);

  useEffect(() => {
    (async () => {
      const [{ data: page }, { data: s }, { data: v }] = await Promise.all([
        sb.from("pages").select("draft,published").eq("slug", "home").maybeSingle(),
        sb.from("settings").select("value").eq("key", "event_date").maybeSingle(),
        sb.from("page_versions").select("id,created_at,blocks").eq("slug", "home").order("id", { ascending: false }).limit(10),
      ]);
      const draft = (page?.draft as Block[]) ?? [];
      const pub = (page?.published as Block[]) ?? [];
      setBlocks(draft.length ? draft : pub.length ? pub : DEFAULT_BLOCKS);
      if (s?.value) setEventDate(s.value as string);
      setVersions((v as any) ?? []);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "preview", blocks, eventDate }, window.location.origin);
  }, [blocks, eventDate]);

  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.data?.type === "preview-ready") { ready.current = true; push(); } };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [push]);
  useEffect(() => { if (ready.current) push(); }, [push]);

  const update = (i: number, props: Record<string, any>) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, props } : b)));
  const updateMeta = (i: number, patch: Partial<Block>) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const duplicate = (i: number) => {
    const src = blocks[i];
    const copy: Block = { ...JSON.parse(JSON.stringify(src)), id: `${src.type}-${Math.random().toString(36).slice(2, 8)}`, slug: "", name: src.name ? `${src.name} copy` : "" };
    setBlocks((bs) => { const a = [...bs]; a.splice(i + 1, 0, copy); return a; });
    setOpen(copy.id);
  };
  const move = (i: number, d: number) => setBlocks((bs) => { const a = [...bs]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  async function saveDraft() {
    setStatus("Saving…");
    const { error } = await sb.from("pages").update({ draft: blocks, updated_at: new Date().toISOString() }).eq("slug", "home");
    setStatus(error ? `Couldn't save: ${error.message}` : "Draft saved");
  }

  async function publish() {
    setStatus("Publishing…");
    const now = new Date().toISOString();
    const r1 = await sb.from("pages").update({ draft: blocks, published: blocks, published_at: now, updated_at: now }).eq("slug", "home");
    if (r1.error) return setStatus(`Couldn't publish: ${r1.error.message}`);
    await sb.from("page_versions").insert({ slug: "home", blocks });
    await sb.from("settings").upsert([
      { key: "tickets_enabled", value: blocks.some((b) => b.type === "tickets"), updated_at: now },
      { key: "event_date", value: eventDate, updated_at: now },
    ]);
    if (notify) {
      const res = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: "The TechFest site was updated", body: `We've updated the Iyin-Ekiti TechFest website with new details. Visit ${SITE.url} to see what's new.` }) });
      const j = await res.json().catch(() => ({}));
      setStatus(res.ok ? `Published. Emailed ${j.sent} subscribers.` : `Published. Email failed: ${String(j.error ?? "").slice(0, 400)}`);
    } else setStatus("Published");
    const { data: v } = await sb.from("page_versions").select("id,created_at,blocks").eq("slug", "home").order("id", { ascending: false }).limit(10);
    setVersions((v as any) ?? []);
  }

  if (!loaded) return <p className="text-muted p-4">Loading…</p>;
  const slugs = resolveSlugs(blocks);
  const width = device === "phone" ? 390 : device === "tablet" ? 768 : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button className="btn-ghost !py-1.5 text-sm" onClick={saveDraft}>Save draft</button>
        <button className="btn-primary !py-1.5 text-sm" onClick={publish}>Publish</button>
        <label className="text-xs text-muted flex items-center gap-1"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />Email subscribers</label>
        <span className="text-xs text-teal">{status}</span>
        <div className="ml-auto flex gap-1 lg:hidden">
          <button className={`px-3 py-1 rounded-full text-sm ${view === "edit" ? "bg-emerald" : "bg-white/10"}`} onClick={() => setView("edit")}>Edit</button>
          <button className={`px-3 py-1 rounded-full text-sm ${view === "preview" ? "bg-emerald" : "bg-white/10"}`} onClick={() => setView("preview")}>Preview</button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[26rem_1fr] gap-4">
        <div className={`${view === "edit" ? "block" : "hidden"} lg:block lg:max-h-[calc(100vh-9rem)] overflow-y-auto pr-1 grid gap-3 content-start`}>
          <div className="glass p-3">
            <div className="text-xs text-muted mb-1">Event date and time (WAT)</div>
            <input className="input" type="datetime-local" value={eventDate.slice(0, 16)} onChange={(e) => setEventDate(`${e.target.value}:00+01:00`)} />
          </div>
          {blocks.map((b, i) => (
            <div key={b.id} className="glass p-3">
              <div className="flex items-center gap-2">
                <button className="flex-1 text-left font-medium min-w-0" onClick={() => setOpen(open === b.id ? null : b.id)}>
                  <span className="block truncate">{b.name || b.props.heading || BLOCK_DEFS[b.type].label}</span>
                  <span className="block text-[11px] font-normal text-muted truncate">{BLOCK_DEFS[b.type].label} · /{slugs[b.id]}</span>
                </button>
                <button className={`!px-3 !py-0.5 text-xs ${open === b.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? "Close" : "Edit"}</button>
                <button className="btn-ghost !px-2 !py-0.5 text-xs" onClick={() => duplicate(i)}>Copy</button>
                <button className="btn-ghost !px-2 !py-0.5 text-xs" onClick={() => move(i, -1)}>Up</button>
                <button className="btn-ghost !px-2 !py-0.5 text-xs" onClick={() => move(i, 1)}>Down</button>
                <button className="btn-ghost !px-2 !py-0.5 text-xs text-countdown" onClick={() => { if (confirm("Remove this section?")) setBlocks(blocks.filter((_, j) => j !== i)); }}>Remove</button>
              </div>
              {open === b.id && <BlockEditor b={b} autoSlug={slugs[b.id]} onChange={(p) => update(i, p)} onMeta={(patch) => updateMeta(i, patch)} />}
            </div>
          ))}
          <div className="glass p-3 flex gap-2">
            <select className="input" value={addType} onChange={(e) => setAddType(e.target.value as BlockType)}>
              {(Object.keys(BLOCK_DEFS) as BlockType[]).map((t) => <option key={t} value={t} className="text-black">{BLOCK_DEFS[t].label}</option>)}
            </select>
            <button className="btn-primary shrink-0 !py-1.5 text-sm" onClick={() => { const nb = newBlock(addType); setBlocks([...blocks, nb]); setOpen(nb.id); }}>Add section</button>
          </div>
          {versions.length > 0 && (
            <div className="glass p-3">
              <div className="font-medium mb-2 text-sm">Published versions</div>
              {versions.map((v) => (
                <div key={v.id} className="flex justify-between items-center text-xs py-1">
                  <span className="text-muted">{new Date(v.created_at).toLocaleString()}</span>
                  <button className="btn-ghost !px-2 !py-0.5" onClick={() => { if (confirm("Load this version into the editor? Publish to make it live.")) setBlocks(v.blocks); }}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`${view === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="flex gap-1 mb-2">
            {(["phone", "tablet", "desktop"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} className={`px-3 py-1 rounded-full text-sm capitalize ${device === d ? "bg-emerald" : "bg-white/10"}`}>{d}</button>
            ))}
          </div>
          <div className="glass p-2 overflow-auto">
            <iframe ref={frame} src="/preview" title="Live preview" className="bg-bg rounded-xl mx-auto block" style={{ width: width ?? "100%", height: "calc(100vh - 11rem)", border: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
