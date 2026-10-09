"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SITE } from "@/lib/site";

const ICONS = [
  "javascript/javascript-original",
  "typescript/typescript-original",
  "python/python-original",
  "java/java-original",
  "cplusplus/cplusplus-original",
  "csharp/csharp-original",
  "c/c-original",
  "go/go-original-wordmark",
  "rust/rust-original",
  "php/php-original",
  "ruby/ruby-original",
  "swift/swift-original",
  "kotlin/kotlin-original",
  "dart/dart-original",
  "scala/scala-original",
  "haskell/haskell-original",
  "elixir/elixir-original",
  "lua/lua-original",
  "r/r-original",
  "perl/perl-original",
  "react/react-original",
  "vuejs/vuejs-original",
  "angularjs/angularjs-original",
  "nextjs/nextjs-original",
  "flutter/flutter-original",
  "svelte/svelte-original",
  "html5/html5-original",
  "css3/css3-original",
  "tailwindcss/tailwindcss-original",
  "nodejs/nodejs-original",
  "postgresql/postgresql-original",
  "mongodb/mongodb-original",
  "redis/redis-original",
  "docker/docker-original",
  "kubernetes/kubernetes-plain",
  "amazonwebservices/amazonwebservices-original-wordmark",
];

const base = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/";

type LoaderItem = { src: string; left: number; delay: number; dur: number; size: number; rotate: number };

export default function Loader() {
  const [show, setShow] = useState(true);
  const [items, setItems] = useState<LoaderItem[]>([]);
  const [grid, setGrid] = useState<string[]>([]);

  useEffect(() => {
    setItems(
      Array.from({ length: 52 }, (_, i) => ({
        src: `${base}${ICONS[i % ICONS.length]}.svg`,
        left: Math.random() * 96,
        delay: Math.random() * 1.6,
        dur: 1.0 + Math.random() * 1.4,
        size: 22 + Math.random() * 28,
        rotate: Math.random() > 0.5 ? 360 : -360,
      }))
    );
    // faint background grid logos
    setGrid(Array.from({ length: 20 }, (_, i) => `${base}${ICONS[(i * 3) % ICONS.length]}.svg`));
    const t = setTimeout(() => setShow(false), 3200);
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
          {/* faint tiled background logos */}
          <div className="absolute inset-0 opacity-[0.07] grid grid-cols-5 md:grid-cols-8 gap-6 p-8 place-items-center pointer-events-none">
            {grid.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`g-${i}`} src={src} alt="" width={48} height={48} className="w-10 h-10 md:w-12 md:h-12 object-contain grayscale" />
            ))}
          </div>

          {/* falling shower — now 52 logos, more density */}
          {items.map((it, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img
              key={i}
              src={it.src}
              alt=""
              width={it.size}
              height={it.size}
              style={{ position: "absolute", left: `${it.left}%`, top: -70 }}
              initial={{ y: -70, opacity: 0, rotate: 0 }}
              animate={{ y: "108vh", opacity: [0, 1, 1, 0.75], rotate: it.rotate }}
              transition={{ duration: it.dur + 1, delay: it.delay, ease: "easeIn" }}
            />
          ))}

          {/* center brand */}
          <motion.div
            className="relative z-10 glass-strong px-6 py-5 bg-white/90"
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(SITE as any).logoBlack || "/logo-black.jpg"} alt={SITE.name} className="w-56 max-w-[70vw] rounded-xl bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]" style={{ filter: "contrast(1.15) brightness(0.98)" }} />
            <p className="text-center text-[10px] tracking-[0.22em] font-semibold text-[#013216]/60 mt-2">IYIN-EKITI TECHFEST</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
