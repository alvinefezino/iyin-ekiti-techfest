"use client";
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={
        "fixed bottom-6 left-1/2 z-[60] grid place-items-center w-11 h-11 rounded-full border shadow-[0_8px_28px_rgba(0,0,0,0.35),0_0_0_1px_rgba(245,127,23,0.25)] transition-all duration-300 -translate-x-1/2 " +
        (visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none") +
        " bg-[#F57F17] hover:bg-[#ff8c1a] text-white border-white/15 hover:scale-[1.04] active:scale-[0.98]"
      }
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V5" />
        <path d="M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}
