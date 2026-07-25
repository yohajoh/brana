"use client";
"use client";

import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/hooks/useQueries";
import { ProfileSettings }       from "@/components/ProfileSettings";
import { SecuritySettings }      from "@/components/SecuritySettings";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { useLanguage }           from "@/components/providers/LanguageProvider";

const fadeUp  = { hidden:{opacity:0,y:16}, show:{opacity:1,y:0,transition:{duration:0.38,ease:[0.16,1,0.3,1]}} };
const stagger = { hidden:{}, show:{transition:{staggerChildren:0.09}} };

export type UserData = {
  id:string; name:string; email:string;
  phone:string|null; year:string|null; department:string|null; student_id:string|null; role:string;
};

export default function SettingsPage() {
  const { t }  = useLanguage();
  const { data: userData, isLoading, error } = useCurrentUser();
  const user = userData?.data?.user as UserData | undefined;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="p-4 sm:p-6 space-y-6 pb-16">

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

      <motion.div variants={fadeUp}
        className="bg-white rounded-2xl border border-[#e8e4dc] p-6 sm:p-7">
        <ProfileSettings user={user || null} loading={isLoading} onUpdate={() => {}} />
      </motion.div>

      <motion.div variants={fadeUp}
        className="bg-white rounded-2xl border border-[#e8e4dc] p-6 sm:p-7">
        <SecuritySettings user={user || null} loading={isLoading} />
      </motion.div>

      <motion.div variants={fadeUp}
        className="bg-white rounded-2xl border border-[#e8e4dc] p-6 sm:p-7">
        <GoogleCalendarSettings />
      </motion.div>

    </motion.div>
  );
}
