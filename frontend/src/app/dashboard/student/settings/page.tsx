"use client";
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Calendar, ChevronRight } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useQueries";
import { ProfileSettings }        from "@/components/ProfileSettings";
import { SecuritySettings }       from "@/components/SecuritySettings";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { useLanguage }            from "@/components/providers/LanguageProvider";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.07}} };
const panelIn = { hidden:{opacity:0,x:16}, show:{opacity:1,x:0,transition:{duration:0.3,ease:[0.16,1,0.3,1]}} };

type UserData = {
  id:string; name:string; email:string;
  phone:string|null; year:string|null; department:string|null; student_id:string|null; role:string;
};

type TabKey = "profile" | "security" | "calendar";

const TABS: { key: TabKey; labelKey: string; icon: React.ElementType; desc: string }[] = [
  { key: "profile",  labelKey: "student_settings.profile_title",  icon: User,     desc: "Name, phone, year, department" },
  { key: "security", labelKey: "student_settings.security_title", icon: Shield,   desc: "Password & email" },
  { key: "calendar", labelKey: "student_settings.calendar_title", icon: Calendar, desc: "Google Calendar sync" },
];

export default function SettingsPage() {
  const { t }   = useLanguage();
  const [tab, setTab] = useState<TabKey>("profile");

  const { data: userData, isLoading, error } = useCurrentUser();
  const user = userData?.data?.user as UserData | undefined;

  const activeTab = TABS.find(tb => tb.key === tab)!;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="p-2 sm:p-4 lg:p-6 pb-16 space-y-6">

      {/* Page header */}
      <motion.div variants={fadeUp}>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Account</p>
        <h1 className="text-[26px] font-serif font-black text-[#0d0d0d]">
          {String(t("student_settings.title"))}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_settings.subtitle"))}</p>
      </motion.div>

      {error && (
        <motion.div variants={fadeUp}
          className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error instanceof Error ? error.message : String(t("common.error_occurred"))}
        </motion.div>
      )}

      {/* Avatar + name hero strip */}
      <motion.div variants={fadeUp}
        className="relative overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white px-5 py-5 flex items-center gap-4">
        {/* Subtle gradient accent */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(135deg,rgba(20,43,111,0.03) 0%,rgba(245,197,24,0.04) 100%)" }} />
        {/* Avatar */}
        <div className="relative shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-black text-[#0d0d0d] z-10"
          style={{ background: "linear-gradient(135deg,#f5c518,#e8a800)", boxShadow: "0 4px 16px rgba(245,197,24,0.35)" }}>
          {isLoading ? "…" : user?.name ? user.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?"}
        </div>
        <div className="z-10 min-w-0">
          {isLoading ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-4 w-32 bg-[#e8e4dc] rounded-full" />
              <div className="h-3 w-48 bg-[#e8e4dc] rounded-full" />
            </div>
          ) : (
            <>
              <p className="text-[16px] font-black text-[#0d0d0d] truncate">{user?.name || "—"}</p>
              <p className="text-[12px] text-[#0d0d0d]/40 truncate">{user?.email}</p>
              {user?.student_id && (
                <p className="text-[10px] text-[#0d0d0d]/30 mt-0.5">
                  ID: {user.student_id}
                  {user.year ? ` · ${user.year}` : ""}
                  {user.department ? ` · ${user.department}` : ""}
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Main layout: sidebar tabs + panel */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">

        {/* Tab sidebar */}
        <div className="sm:w-52 shrink-0 space-y-1">
          {TABS.map(tb => {
            const Icon = tb.icon;
            const active = tab === tb.key;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  active
                    ? "bg-[#142b6f] text-white shadow-md"
                    : "bg-white border border-[#e8e4dc] text-[#0d0d0d]/60 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/20"
                }`}>
                <Icon size={15} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-[#f5c518]" : "text-[#0d0d0d]/40"} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[12.5px] font-bold truncate ${active ? "text-white" : "text-[#0d0d0d]"}`}>
                    {String(t(tb.labelKey))}
                  </p>
                  <p className={`text-[10px] truncate ${active ? "text-white/50" : "text-[#0d0d0d]/35"}`}>
                    {tb.desc}
                  </p>
                </div>
                <ChevronRight size={12} className={active ? "text-white/40" : "text-[#0d0d0d]/20"} />
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              variants={panelIn}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: -8, transition: { duration: 0.18 } }}
              className="bg-white rounded-2xl border border-[#e8e4dc] p-5 sm:p-7"
            >
              {/* Panel header */}
              <div className="flex items-center gap-2.5 mb-6 pb-5 border-b border-[#e8e4dc]">
                <div className="w-8 h-8 rounded-xl bg-[#142b6f] flex items-center justify-center shrink-0">
                  <activeTab.icon size={14} className="text-[#f5c518]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[14px] font-black text-[#0d0d0d]">{String(t(activeTab.labelKey))}</p>
                  <p className="text-[11px] text-[#0d0d0d]/35">{activeTab.desc}</p>
                </div>
              </div>

              {tab === "profile"  && <ProfileSettings user={user || null} loading={isLoading} onUpdate={() => {}} />}
              {tab === "security" && <SecuritySettings user={user || null} loading={isLoading} />}
              {tab === "calendar" && <GoogleCalendarSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

    </motion.div>
  );
}
