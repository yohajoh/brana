"use client";

import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Props = { user: { email: string } | null; loading?: boolean; };

const ICdis = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f0eeea] text-sm text-[#0d0d0d]/40 cursor-not-allowed";
const LB    = "text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider mb-1.5 block";

export const SecuritySettings = ({ user, loading }: Props) => {
  const { t } = useLanguage();
  const [pwOpen, setPwOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-[#f0eeea] rounded-xl" />
        <div className="h-14 bg-[#f0eeea] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Email row */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className={LB}>
            <span className="flex items-center gap-1.5">
              <Mail size={10} className="opacity-60" />
              {String(t("student_settings.labels.email"))}
            </span>
          </label>
          <input type="email" value={user?.email || ""} disabled className={ICdis} />
        </div>
        <button disabled
          className="px-5 py-3 rounded-xl bg-[#f0eeea] text-[#0d0d0d]/30 text-[12px] font-bold cursor-not-allowed whitespace-nowrap">
          {String(t("student_settings.messages.email_readonly_btn"))}
        </button>
      </div>

      {/* Password row */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className={LB}>
            <span className="flex items-center gap-1.5">
              <Lock size={10} className="opacity-60" />
              {String(t("student_settings.labels.password"))}
            </span>
          </label>
          <input type="password" value="••••••••••••" disabled className={ICdis} />
        </div>
        <button onClick={() => setPwOpen(true)}
          className="px-5 py-3 rounded-xl bg-[#142b6f] text-white text-[12px] font-bold hover:bg-[#1e3a8a] transition-colors whitespace-nowrap shadow-md">
          {String(t("student_settings.actions.change_password"))}
        </button>
      </div>

      {/* Info box */}
      <div className="rounded-xl bg-[#f5f4f0] border border-[#e8e4dc] px-4 py-3">
        <p className="text-[11px] text-[#0d0d0d]/40 leading-relaxed">
          Your email cannot be changed. To update your password, click the button above. Use a strong password with at least 8 characters.
        </p>
      </div>

      <ChangePasswordModal isOpen={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
};
