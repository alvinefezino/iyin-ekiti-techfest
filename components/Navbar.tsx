"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SITE } from "@/lib/site";
import { BLOCK_DEFS, type Block } from "@/lib/blocks";
import { pad, useCountdown } from "@/hooks/useCountdown";

export default function Navbar({ blocks, heroVisible }: { blocks: Block[]; heroVisible: boolean }) {
  const c = useCountdown();
  const [open, setOpen] = useState(false);
  const links = blocks.filter((b) => BLOCK_DEFS[b.type]?.nav && b.props.heading).slice(0, 6);

  return (
    <header className="fixed top-0 inset-x-0 z-50 p-3">
      <nav className="glass-strong max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 py-2">
        <a href="#" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE.logo} alt={SITE.name} className="h-8 w-auto rounded" />
        </a>

        <AnimatePresence>
          {!heroVisible && (
            <motion.a
              href="#"
              layout
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="font-mono text-sm text-countdown px-3 py-1 rounded-full border border-white/20 bg-white/10"
              aria-label="Time until the event"
            >
              {c.days}d {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
            </motion.a>
          )}
        </AnimatePresence>

        <div className="hidden md:flex items-center gap-5 text-sm">
          {links.map((b) => (
            <a key={b.id} href={`#${b.id}`} className="text-muted hover:text-ink transition-colors">
              {b.props.heading}
            </a>
          ))}
        </div>

        <button className="md:hidden btn-ghost !px-3 !py-1" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? "Close" : "Menu"}
        </button>
      </nav>
      {open && (
        <div className="md:hidden glass-strong max-w-6xl mx-auto mt-2 p-4 flex flex-col gap-3">
          {links.map((b) => (
            <a key={b.id} href={`#${b.id}`} onClick={() => setOpen(false)}>
              {b.props.heading}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
