"use client";

import { useState } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useLanguage } from "@/components/providers/LanguageProvider";

type UserData = {
  email: string;
};

type Props = {
  user: UserData | null;
  loading?: boolean;
};

export const SecuritySettings = ({ user, loading }: Props) => {
  const { t } = useLanguage();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-8">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          {t("student_settings.security_title")}
        </h3>
        <div className="space-y-6 max-w-3xl animate-pulse">
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        {t("student_settings.security_title")}
      </h3>

      <div className="space-y-6 max-w-3xl">
        {/* Email Section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
              {t("student_settings.labels.email")}
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed"
            />
          </div>
          <button
            disabled
            className="px-6 py-3.5 rounded-xl bg-muted text-secondary text-xs font-extrabold transition-all cursor-not-allowed opacity-50"
          >
            {t("student_settings.messages.email_readonly_btn")}
          </button>
        </div>

        {/* Password Section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
              {t("student_settings.labels.password")}
            </label>
            <input
              type="password"
              value="............"
              disabled
              className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed tracking-widest"
            />
          </div>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-6 py-3.5 rounded-xl bg-accent text-background text-xs font-extrabold hover:bg-primary transition-all active:scale-95 whitespace-nowrap shadow-md"
          >
            {t("student_settings.actions.change_password")}
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
