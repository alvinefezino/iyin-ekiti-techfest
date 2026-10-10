"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Builder from "@/components/admin/Builder";
import { ChatbotPanel, SettingsPanel, AudiencePanel, RegistrationsPanel, AttendeesPanel, CheckinPanel, ExamPanel, SponsorPromoPanel } from "@/components/admin/Panels";

const TABS = ["Page builder", "Chatbot", "Settings", "Subscribers", "Hackathon", "Attendees", "Exam Terminal", "Check-in", "Sponsor promos"] as const;

export default function AdminApp({ email }: { email: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Page builder");
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="min-h-screen p-2 sm:p-3 md:p-5">
      <header className="glass-strong px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4 rounded-xl">
        <b className="text-sm sm:text-base shrink-0">TechFest admin</b>
        <span className="text-[11px] text-muted hidden lg:block truncate max-w-[160px]">{email}</span>
        <button className="ml-auto md:hidden btn-ghost !py-1 !px-3 text-xs" onClick={()=> setMenuOpen(v=>!v)}>{menuOpen ? "Close" : "Menu"}</button>
        <div className={"w-full md:w-auto md:flex-1 flex md:flex flex-wrap gap-1 " + (menuOpen ? "flex mt-2" : "hidden md:flex") }>
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); setMenuOpen(false); }} className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap ${tab === t ? "bg-[#F57F17] text-white" : "bg-white/10 hover:bg-white/20"}`}>{t}</button>
          ))}
        </div>
        <span className="text-[11px] text-muted md:hidden w-full truncate">{email}</span>
        <button className="btn-ghost !py-1 !px-3 text-xs sm:text-sm hidden md:inline-flex" onClick={async () => { await supabaseBrowser().auth.signOut(); router.push("/admin/login"); }}>Sign out</button>
        <button className={"btn-ghost !py-1 !px-3 text-xs w-full md:hidden " + (menuOpen ? "block" : "hidden")} onClick={async () => { await supabaseBrowser().auth.signOut(); router.push("/admin/login"); }}>Sign out</button>
      </header>
      <div className="overflow-x-hidden">
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
    </div>
  );
}
