"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Calendar, Bell, ChevronRight, AlertTriangle, ShieldOff, ShieldCheck, AlertOctagon } from "lucide-react";
import { useCurrentUser, useMyRentals } from "@/lib/hooks/useQueries";
import { ProfileSettings }        from "@/components/ProfileSettings";
import { SecuritySettings }       from "@/components/SecuritySettings";
import { NotificationSettings }   from "@/components/NotificationSettings";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { useLanguage }            from "@/components/providers/LanguageProvider";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.07}} };
const panelIn = { hidden:{opacity:0,x:16}, show:{opacity:1,x:0,transition:{duration:0.3,ease:[0.16,1,0.3,1]}} };

type Standing = "GOOD_STANDING" | "YELLOW_FLAG" | "RED_FLAG" | "SUSPENDED";

type UserData = {
  id:string; name:string; email:string;
  phone:string|null; year:string|null; department:string|null; student_id:string|null; role:string;
  trust_score?: number | null;
  standing?: Standing | null;
  standing_note?: string | null;
};

type TabKey = "profile" | "security" | "notifications" | "calendar";

const TABS: { key: TabKey; labelKey: string; icon: React.ElementType; desc: string }[] = [
  { key: "profile",       labelKey: "student_settings.profile_title",  icon: User,     desc: "Name, phone, year, department" },
  { key: "security",      labelKey: "student_settings.security_title", icon: Shield,   desc: "Password & email" },
  { key: "notifications", labelKey: "Notifications & Sounds",          icon: Bell,     desc: "Sound chime & desktop alerts" },
  { key: "calendar",      labelKey: "student_settings.calendar_title", icon: Calendar, desc: "Google Calendar sync" },
];

const standingConfig: Record<Standing, {
  label: string; icon: React.ElementType;
  banner: string; text: string; subtext: string;
}> = {
  GOOD_STANDING: {
    label: "Good Standing",
    icon: ShieldCheck,
    banner: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    subtext: "Your account is in good standing. Full borrowing privileges are active.",
  },
  YELLOW_FLAG: {
    label: "Warning",
    icon: AlertTriangle,
    banner: "bg-amber-50 border-amber-200",
    text: "text-amber-900",
    subtext: "Your borrowing limit is reduced to 1 book at a time. Resolve any outstanding issues to restore full access.",
  },
  RED_FLAG: {
    label: "Red Flag",
    icon: AlertOctagon,
    banner: "bg-orange-50 border-orange-200",
    text: "text-orange-900",
    subtext: "Strict limits apply. You may only hold 1 book at a time. Please visit the library desk to resolve your account.",
  },
  SUSPENDED: {
    label: "Suspended",
    icon: ShieldOff,
    banner: "bg-rose-50 border-rose-200",
    text: "text-rose-900",
    subtext: "Borrowing is currently disabled on your account. Please contact the library administration.",
  },
};

function AccountStatusBanner({ user }: { user: UserData }) {
  const standing: Standing = (user.standing as Standing) || "GOOD_STANDING";
  const cfg = standingConfig[standing];
  const Icon = cfg.icon;
  const score = user.trust_score ?? 100;
  const pct = Math.max(0, Math.min(100, score));
  const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-rose-500";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cfg.banner}`}>
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={cfg.text} />
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-black ${cfg.text}`}>Account Status: {cfg.label}</p>
          <p className={`text-[11px] leading-relaxed mt-0.5 ${cfg.text} opacity-80`}>{cfg.subtext}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-[20px] font-serif font-black leading-none ${cfg.text}`}>{score}</p>
          <p className={`text-[9px] font-black uppercase tracking-wider ${cfg.text} opacity-60`}>/ 100 trust</p>
        </div>
      </div>

      {/* Trust score bar */}
      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Admin note if present */}
      {user.standing_note && standing !== "GOOD_STANDING" && (
        <p className={`text-[11px] italic border-t border-black/10 pt-2 ${cfg.text} opacity-70`}>
          Library note: "{user.standing_note}"
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t }   = useLanguage();
  const [tab, setTab] = useState<TabKey>("profile");

  const { data: userData, isLoading, error } = useCurrentUser();
  const user = userData?.data?.user as UserData | undefined;

  // Fetch active rentals to show outstanding fine warning
  const { data: rentalsData } = useMyRentals("active=true&limit=20");
  const pendingRentals = (rentalsData?.rentals || []).filter((r: any) => r.status === "PENDING" && Number(r.fine || 0) > 0);
  const pendingFineTotal = pendingRentals.reduce((sum: number, r: any) => sum + Number(r.fine || 0), 0);

  const activeTab = TABS.find(tb => tb.key === tab)!;
  const standing: Standing = (user?.standing as Standing) || "GOOD_STANDING";
  const showStatusBanner = !isLoading && user && (standing !== "GOOD_STANDING" || pendingFineTotal > 0);

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

      {/* Account status banner — shown whenever there's a flag or outstanding fines */}
      {showStatusBanner && (
        <motion.div variants={fadeUp} className="space-y-2">
          <AccountStatusBanner user={user!} />
          {pendingFineTotal > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2.5">
              <AlertTriangle size={14} className="text-amber-700 shrink-0" />
              <p className="text-[12px] text-amber-900 leading-snug">
                You have <strong>{pendingRentals.length} unpaid fine{pendingRentals.length > 1 ? "s" : ""}</strong> totalling{" "}
                <strong>{pendingFineTotal.toFixed(2)} ETB</strong>. Pay at the library desk to unlock full borrowing access.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Avatar + name hero strip */}
      <motion.div variants={fadeUp}
        className="relative overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white px-5 py-5 flex items-center gap-4">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(135deg,rgba(20,43,111,0.03) 0%,rgba(245,197,24,0.04) 100%)" }} />
        <div className="relative shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-black text-[#0d0d0d] z-10"
          style={{ background: "linear-gradient(135deg,#f5c518,#e8a800)", boxShadow: "0 4px 16px rgba(245,197,24,0.35)" }}>
          {isLoading ? "…" : user?.name ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase() : "?"}

          {/* ── Standing flag badge (notification-badge style) ─────── */}
          {!isLoading && user && standing !== "GOOD_STANDING" && (() => {
            const badgeColors: Record<string, string> = {
              YELLOW_FLAG: "bg-amber-400",
              RED_FLAG:    "bg-orange-600",
              SUSPENDED:   "bg-rose-600",
            };
            const cfg = standingConfig[standing];
            const Icon = cfg.icon;
            const tooltipText = cfg.label;
            const reason = user.standing_note?.trim();
            return (
              <span className="group/badge absolute -top-1.5 -right-1.5 z-20">
                {/* badge pill */}
                <span className={`flex items-center justify-center w-5 h-5 rounded-full shadow-md border-2 border-white ${badgeColors[standing] ?? "bg-gray-500"}`}>
                  <Icon size={9} className="text-white" strokeWidth={2.5} />
                </span>

                {/* tooltip */}
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 z-50
                  w-max max-w-[220px] px-3 py-2 rounded-xl
                  bg-[#0d0d0d] text-white shadow-2xl
                  opacity-0 scale-95 origin-bottom-right
                  group-hover/badge:opacity-100 group-hover/badge:scale-100
                  transition-all duration-150 text-left">
                  {/* standing label */}
                  <span className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${
                    standing === "YELLOW_FLAG" ? "text-amber-400"
                    : standing === "RED_FLAG"  ? "text-orange-400"
                    : "text-rose-400"
                  }`}>{tooltipText}</span>

                  {/* trust score */}
                  <span className="block text-[11px] font-semibold text-white/80 mb-1">
                    Trust score: <strong className="text-white">{user.trust_score ?? 100} / 100</strong>
                  </span>

                  {/* what it means */}
                  <span className="block text-[10px] text-white/60 leading-snug">
                    {cfg.subtext}
                  </span>

                  {/* admin note */}
                  {reason && (
                    <span className="block text-[10px] text-white/50 italic mt-1.5 border-t border-white/10 pt-1.5">
                      "{reason}"
                    </span>
                  )}

                  {/* tooltip arrow */}
                  <span className="absolute top-full right-3 border-4 border-transparent border-t-[#0d0d0d]" />
                </span>
              </span>
            );
          })()}
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
              <div className="flex items-center gap-2.5 mb-6 pb-5 border-b border-[#e8e4dc]">
                <div className="w-8 h-8 rounded-xl bg-[#142b6f] flex items-center justify-center shrink-0">
                  <activeTab.icon size={14} className="text-[#f5c518]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[14px] font-black text-[#0d0d0d]">{String(t(activeTab.labelKey))}</p>
                  <p className="text-[11px] text-[#0d0d0d]/35">{activeTab.desc}</p>
                </div>
              </div>

              {tab === "profile"       && <ProfileSettings user={user || null} loading={isLoading} onUpdate={() => {}} />}
              {tab === "security"      && <SecuritySettings user={user || null} loading={isLoading} />}
              {tab === "notifications" && <NotificationSettings />}
              {tab === "calendar"      && <GoogleCalendarSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

    </motion.div>
  );
}

