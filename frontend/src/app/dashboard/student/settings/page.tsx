"use client";

import { useCurrentUser } from "@/lib/hooks/useQueries";
import { ProfileSettings } from "@/components/ProfileSettings";
import { SecuritySettings } from "@/components/SecuritySettings";
import { GoogleCalendarSettings } from "@/components/GoogleCalendarSettings";
import { useLanguage } from "@/components/providers/LanguageProvider";

export type UserData = {
  id: string; name: string; email: string;
  phone: string | null; year: string | null;
  department: string | null; student_id: string | null; role: string;
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const { data: userData, isLoading, error } = useCurrentUser();
  const user = userData?.data?.user as UserData | undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-7 sm:px-6 lg:px-8 space-y-10 pb-16">

      {/* Header */}
      <div>
        <p className="text-[9px] font-black text-[#0d0d0d]/30 uppercase tracking-[0.2em] mb-1">Account</p>
        <h1 className="text-[28px] font-serif font-black text-[#0d0d0d]">
          {String(t("student_settings.title"))}
        </h1>
        <p className="text-sm text-[#0d0d0d]/45 mt-1">{String(t("student_settings.subtitle"))}</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error instanceof Error ? error.message : String(t("common.error_occurred"))}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-10">
        <div className="bg-white rounded-2xl border border-[#e8e6e1] p-6 sm:p-8">
          <ProfileSettings user={user || null} loading={isLoading} onUpdate={() => {}} />
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e6e1] p-6 sm:p-8">
          <SecuritySettings user={user || null} loading={isLoading} />
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e6e1] p-6 sm:p-8">
          <GoogleCalendarSettings />
        </div>
      </div>
    </div>
  );
}
