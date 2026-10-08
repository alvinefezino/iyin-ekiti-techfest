"use client";
import { useState } from "react";
import type { Block } from "@/lib/blocks";
import { CountdownProvider } from "@/hooks/useCountdown";
import BlockRenderer from "@/components/BlockRenderer";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import Chatbot from "@/components/Chatbot";
import CookieBanner from "@/components/CookieBanner";

export default function HomeView({
  blocks, eventDate, cookieText, preview = false,
}: { blocks: Block[]; eventDate: string; cookieText?: string; preview?: boolean }) {
  const [heroVisible, setHeroVisible] = useState(true);
  return (
    <CountdownProvider date={eventDate}>
      {!preview && <Loader />}
      <Navbar blocks={blocks} heroVisible={heroVisible || !blocks.some((b) => b.type === "hero")} />
      <main>
        <BlockRenderer blocks={blocks} onHeroVisible={setHeroVisible} />
      </main>
      {!preview && <Chatbot />}
      {!preview && <CookieBanner text={cookieText || "We use cookies to improve your experience."} />}
    </CountdownProvider>
  );
}
