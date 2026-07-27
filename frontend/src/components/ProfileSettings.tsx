"use client";
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type UserData = {
  id: string; name: string; email: string;
  phone: string | null; year: string | null;
  department: string | null; student_id: string | null; role: string;
};

type Props = { user: UserData | null; loading?: boolean; onUpdate: (user: UserData) => void; };

const IC = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f5f4f0] text-sm text-[#0d0d0d] focus:outline-none focus:border-[#142b6f] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,43,111,0.08)] transition-all placeholder:text-[#0d0d0d]/25";
const ICdis = "w-full px-4 py-3 rounded-xl border border-[#e8e4dc] bg-[#f0eeea] text-sm text-[#0d0d0d]/40 cursor-not-allowed";
const LB = "text-[10px] font-black text-[#0d0d0d]/40 uppercase tracking-wider mb-1.5 block";

export const ProfileSettings = ({ user, loading, onUpdate }: Props) => {
  const { t } = useLanguage();
  const [name, setName]             = useState(() => user?.name || "");
  const [phone, setPhone]           = useState(() => user?.phone || "");
  const [year, setYear]             = useState(() => user?.year || "");
  const [department, setDepartment] = useState(() => user?.department || "");
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setName(user.name || "");
      setPhone(user.phone || "");
      setYear(user.year || "");
      setDepartment(user.department || "");
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, phone: phone || null, year: year || null, department: department || null });
      if (user) onUpdate({ ...user, name, phone: phone || null, year: year || null, department: department || null });
      toast.success(t("student_settings.messages.success_update"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("student_settings.messages.failed_update"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-12 bg-[#f0eeea] rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Full name */}
      <div>
        <label className={LB}>{String(t("student_settings.labels.full_name"))}</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={String(t("student_settings.placeholders.full_name"))} className={IC} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Student ID — readonly */}
        <div>
          <label className={LB}>{String(t("student_settings.labels.student_id"))}</label>
          <input type="text" value={user?.student_id || String(t("student_settings.hints.not_set"))} disabled className={ICdis} />
          <p className="text-[10px] text-[#0d0d0d]/30 mt-1">{String(t("student_settings.hints.student_id"))}</p>
        </div>

        {/* Phone */}
        <div>
          <label className={LB}>{String(t("student_settings.labels.phone"))}</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder={String(t("student_settings.placeholders.phone"))} className={IC} />
        </div>

        {/* Year */}
        <div>
          <label className={LB}>{String(t("student_settings.labels.year"))}</label>
          <select value={year} onChange={e => setYear(e.target.value)} className={IC}>
            <option value="">{String(t("student_settings.placeholders.select_year"))}</option>
            <option value="1st Year">{String(t("student_settings.years.y1"))}</option>
            <option value="2nd Year">{String(t("student_settings.years.y2"))}</option>
            <option value="3rd Year">{String(t("student_settings.years.y3"))}</option>
            <option value="4th Year">{String(t("student_settings.years.y4"))}</option>
            <option value="5th Year">{String(t("student_settings.years.y5"))}</option>
          </select>
        </div>

        {/* Department */}
        <div>
          <label className={LB}>{String(t("student_settings.labels.department"))}</label>
          <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
            placeholder={String(t("student_settings.placeholders.department"))} className={IC} />
        </div>
      </div>

      {/* Email — readonly */}
      <div>
        <label className={LB}>{String(t("student_settings.labels.email"))}</label>
        <input type="email" value={user?.email || ""} disabled className={ICdis} />
        <p className="text-[10px] text-[#0d0d0d]/30 mt-1">{String(t("student_settings.hints.email_readonly"))}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => { setName(user?.name||""); setPhone(user?.phone||""); setYear(user?.year||""); setDepartment(user?.department||""); }}
          disabled={updateProfile.isPending}
          className="px-5 py-2.5 rounded-xl border border-[#e8e4dc] text-sm font-bold text-[#0d0d0d]/50 hover:text-[#0d0d0d] hover:border-[#0d0d0d]/30 disabled:opacity-40 transition-all">
          {String(t("student_settings.actions.cancel"))}
        </button>
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending || !name.trim()}
          className="px-6 py-2.5 rounded-xl bg-[#142b6f] text-white text-sm font-bold hover:bg-[#1e3a8a] disabled:opacity-50 transition-all shadow-md">
          {updateProfile.isPending ? String(t("student_settings.actions.saving")) : String(t("student_settings.actions.save"))}
        </button>
      </div>
    </div>
  );
};
