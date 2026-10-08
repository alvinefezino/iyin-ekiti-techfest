"use client";
import { useEffect, useState } from "react";
import HomeView from "@/components/HomeView";
import { DEFAULT_BLOCKS, type Block } from "@/lib/blocks";
import { SITE } from "@/lib/site";

export default function Preview() {
  const [blocks, setBlocks] = useState<Block[]>(DEFAULT_BLOCKS);
  const [date, setDate] = useState(SITE.eventDate);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "preview") {
        setBlocks(e.data.blocks);
        if (e.data.eventDate) setDate(e.data.eventDate);
      }
    };
    window.addEventListener("message", on);
    window.parent.postMessage({ type: "preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  return <HomeView blocks={blocks} eventDate={date} preview />;
}
