"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Hi! Ask me anything about the hackathon, schedule, or speakers." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-10) }) });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: "Sorry, I couldn't answer that right now. Try again in a moment." }]);
    }
    setBusy(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[55]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-strong mb-3 w-[min(92vw,22rem)] h-[26rem] flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/15 font-medium">TechFest assistant</div>
            <div className="flex-1 overflow-y-auto p-3 grid gap-2 content-start">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-emerald justify-self-end" : "bg-white/10"}`}>
                  {m.content || "…"}
                </div>
              ))}
              <div ref={end} />
            </div>
            <form onSubmit={send} className="p-2 flex gap-2 border-t border-white/15">
              <input className="input !py-2" placeholder="Ask a question" value={input} onChange={(e) => setInput(e.target.value)} />
              <button className="btn-primary !px-4 !py-2" disabled={busy}>Send</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} className="btn-primary ml-auto block shadow-lg" aria-label="Open chat">
        {open ? "Close" : "Ask AI"}
      </button>
    </div>
  );
}
