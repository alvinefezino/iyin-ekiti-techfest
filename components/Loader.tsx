"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SITE } from "@/lib/site";

const ICONS = [
  "react/react-original", "java/java-original", "rust/rust-original", "python/python-original",
  "cplusplus/cplusplus-original", "go/go-original-wordmark", "javascript/javascript-original",
  "typescript/typescript-original", "kotlin/kotlin-original", "swift/swift-original",
  "php/php-original", "csharp/csharp-original", "ruby/ruby-original", "nodejs/nodejs-original",
  "dart/dart-original", "c/c-original",
];
const base = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/";

type LoaderItem = { src: string; left: number; delay: number; dur: number; size: number };

export default function Loader() {
  const [show, setShow] = useState(true);
  const [items, setItems] = useState<LoaderItem[]>([]);

  useEffect(() => {
    setItems(
      Array.from({ length: 28 }, (_, i) => ({
        src: `${base}${ICONS[i % ICONS.length]}.svg`,
        left: Math.random() * 94,
        delay: Math.random() * 1.4,
        dur: 1.2 + Math.random() * 1.2,
        size: 28 + Math.random() * 22,
      }))
    );
    const t = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-bg grid place-items-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {items.map((it, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img
              key={i}
              src={it.src}
              alt=""
              width={it.size}
              height={it.size}
              style={{ position: "absolute", left: `${it.left}%`, top: -60 }}
              initial={{ y: -60, opacity: 0, rotate: 0 }}
              animate={{ y: "105vh", opacity: [0, 1, 1, 0.8], rotate: 360 }}
              transition={{ duration: it.dur + 1, delay: it.delay, ease: "easeIn" }}
            />
          ))}
          <motion.div
            className="relative z-10 glass-strong px-6 py-5 bg-white/90"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(SITE as any).logoBlack || "/logo-black.jpg"} alt={SITE.name} className="w-56 max-w-[70vw] rounded-xl bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]" style={{ filter: "contrast(1.15) brightness(0.98)" }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
