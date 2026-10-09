"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Builder from "@/components/admin/Builder";
import { ChatbotPanel, SettingsPanel, AudiencePanel, RegistrationsPanel, AttendeesPanel, CheckinPanel, ExamPanel, SponsorPromoPanel } from "@/components/admin/Panels";

const TABS = ["Page builder", "Chatbot", "Settings", "Subscribers", "Hackathon", "Attendees", "Exam Terminal", "Check-in", "Sponsor promos"] as const;

export default function AdminApp({ email }: { email: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Page builder");
  const router = useRouter();
  return (
    <div className="min-h-screen p-3 md:p-5">
      <header className="glass-strong px-4 py-3 flex flex-wrap items-center gap-3 mb-4">
        <b className="mr-2">TechFest admin</b>
        <div className="flex flex-wrap gap-1 flex-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm ${tab === t ? "bg-emerald" : "bg-white/10 hover:bg-white/20"}`}>{t}</button>
          ))}
        </div>
        <span className="text-xs text-muted hidden md:block">{email}</span>
        <button className="btn-ghost !py-1 !px-3 text-sm" onClick={async () => { await supabaseBrowser().auth.signOut(); router.push("/admin/login"); }}>Sign out</button>
      </header>
      {tab === "Page builder" && <Builder />}
      {tab === "Chatbot" && <ChatbotPanel />}
      {tab === "Settings" && <SettingsPanel />}
      {tab === "Subscribers" && <AudiencePanel />}
      {tab === "Hackathon" && <RegistrationsPanel />}
      {tab === "Attendees" && <AttendeesPanel />}
      {tab === "Exam Terminal" && <ExamPanel />}
      {tab === "Check-in" && <CheckinPanel />}
      {tab === "Sponsor promos" && <SponsorPromoPanel />}
    </div>
  );
}
