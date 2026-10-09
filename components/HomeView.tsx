"use client";
import { useEffect, useState } from "react";
import type { Block } from "@/lib/blocks";
import { CountdownProvider } from "@/hooks/useCountdown";
import BlockRenderer from "@/components/BlockRenderer";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import Chatbot from "@/components/Chatbot";
import CookieBanner from "@/components/CookieBanner";

export default function HomeView({
  blocks, eventDate, cookieText, preview = false, focus,
}: { blocks: Block[]; eventDate: string; cookieText?: string; preview?: boolean; focus?: string }) {
  const [heroVisible, setHeroVisible] = useState(true);
  // Opened via a section link such as /meet-the-team: scroll there once the loader is done
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => document.getElementById(focus)?.scrollIntoView({ behavior: "smooth" }), preview ? 300 : 3300);
    return () => clearTimeout(t);
  }, [focus, preview]);
  return (
    <CountdownProvider date={eventDate}>
      {!preview && <Loader />}
      <Navbar blocks={blocks} preview={preview} heroVisible={heroVisible || !blocks.some((b) => b.type === "hero")} />
      <main>
        <BlockRenderer blocks={blocks} onHeroVisible={setHeroVisible} />
      </main>
      {!preview && <Chatbot />}
      {!preview && <CookieBanner text={cookieText || "We use cookies to improve your experience."} />}
    </CountdownProvider>
  );
}
