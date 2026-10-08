"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Backdrop from "@/components/Backdrop";

type Consent = { essential: true; analytics: boolean; marketing: boolean };
const KEY = "cookie-consent";

export default function CookieBanner({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [manage, setManage] = useState(false);
  const [c, setC] = useState<Consent>({ essential: true, analytics: false, marketing: false });

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true); } catch { setShow(true); }
  }, []);

  const save = (v: Consent) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
    document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify(v))}; path=/; max-age=31536000; samesite=lax`;
    setShow(false);
  };

  return (
    <>
    <Backdrop show={show && manage} onClick={() => setManage(false)} z="z-[59]" />
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(94vw,34rem)] glass-modal p-4"
          role="dialog"
          aria-label="Cookie settings"
        >
          <p className="text-sm text-center">{text}</p>
          {manage && (
            <div className="mt-3 grid gap-2 text-sm">
              <label className="flex justify-between"><span>Essential</span><input type="checkbox" checked disabled /></label>
              <label className="flex justify-between"><span>Analytics</span><input type="checkbox" checked={c.analytics} onChange={(e) => setC({ ...c, analytics: e.target.checked })} /></label>
              <label className="flex justify-between"><span>Marketing</span><input type="checkbox" checked={c.marketing} onChange={(e) => setC({ ...c, marketing: e.target.checked })} /></label>
            </div>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button className="btn-primary !py-1.5 !px-4 text-sm" onClick={() => save({ essential: true, analytics: true, marketing: true })}>Accept all</button>
            {manage
              ? <button className="btn-ghost !py-1.5 !px-4 text-sm" onClick={() => save(c)}>Save choices</button>
              : <button className="btn-ghost !py-1.5 !px-4 text-sm" onClick={() => setManage(true)}>Manage</button>}
            <button className="btn-ghost !py-1.5 !px-4 text-sm" onClick={() => save({ essential: true, analytics: false, marketing: false })}>Reject</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
