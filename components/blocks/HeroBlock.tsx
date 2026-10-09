"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCountdown } from "@/hooks/useCountdown";

const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });

export default function HeroBlock({
  props, onVisible,
}: { props: Record<string, any>; onVisible?: (v: boolean) => void }) {
  const ref = useRef<HTMLElement>(null);
  const remaining = useCountdown();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const textOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onVisible) return;
    const io = new IntersectionObserver(([e]) => onVisible(e.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);

  return (
    <section ref={ref} id="hero" className="relative" style={{ height: "260vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0 translate-y-[14vh] md:translate-y-0">
          <Hero3D remaining={remaining} progress={scrollYProgress} />
        </div>
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative z-10 pt-12 md:pt-24 px-5 text-center pointer-events-none"
        >
          <p className="text-teal text-sm md:text-base">{props.eyebrow}</p>
          <h1 className="text-4xl md:text-7xl font-semibold mt-2 leading-tight">{props.title}</h1>
          <p className="text-muted max-w-xl mx-auto mt-3 text-sm md:text-lg">{props.subtitle}</p>
        </motion.div>
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute bottom-8 inset-x-0 z-10 flex justify-center"
        >
          <a href={props.ctaHref || "#register"} className="btn-primary">
            {props.ctaLabel}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
