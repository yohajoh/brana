"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/lib/hooks/useQueries";
import { useLanguage } from "@/components/providers/LanguageProvider";

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  year: string | null;
  department: string | null;
  student_id: string | null;
  role: string;
};

type Props = {
  user: UserData | null;
  loading?: boolean;
  onUpdate: (user: UserData) => void;
};

export const ProfileSettings = ({ user, loading, onUpdate }: Props) => {
  const { t } = useLanguage();
  const [name, setName] = useState(() => user?.name || "");
  const [phone, setPhone] = useState(() => user?.phone || "");
  const [year, setYear] = useState(() => user?.year || "");
  const [department, setDepartment] = useState(() => user?.department || "");
  const updateProfile = useUpdateProfile();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setName(user.name || "");
        setPhone(user.phone || "");
        setYear(user.year || "");
        setDepartment(user.department || "");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setMessage(null);

      await updateProfile.mutateAsync({
        name,
        phone: phone || null,
        year: year || null,
        department: department || null,
      });

      if (user) {
        onUpdate({
          ...user,
          name,
          phone: phone || null,
          year: year || null,
          department: department || null,
        });
      }

      toast.success(t("student_settings.messages.success_update"));
      setMessage({ type: "success", text: t("student_settings.messages.success_update") });
    } catch (e) {
      setMessage({ 
        type: "error", 
        text: e instanceof Error ? e.message : t("student_settings.messages.failed_update") 
      });
      toast.error(e instanceof Error ? e.message : t("student_settings.messages.failed_update"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <h3 className="text-xl font-serif font-extrabold text-primary">
          {t("student_settings.profile_title")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl animate-pulse">
          <div className="md:col-span-2 h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
          <div className="h-16 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-serif font-extrabold text-primary">
        {t("student_settings.profile_title")}
      </h3>

      {message && (
        <div
          className={`rounded-xl p-4 text-sm border ${
            message.type === "success"
              ? "bg-green-50 text-green-600 border-green-100"
              : "bg-red-50 text-red-600 border-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            {t("student_settings.labels.full_name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("student_settings.placeholders.full_name")}
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            {t("student_settings.labels.student_id")}
          </label>
          <input
            type="text"
            value={user?.student_id || t("student_settings.hints.not_set")}
            disabled
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed"
          />
          <p className="text-xs text-secondary/60 px-1">
            {t("student_settings.hints.student_id")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            {t("student_settings.labels.phone")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("student_settings.placeholders.phone")}
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            {t("student_settings.labels.year")}
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          >
            <option value="">{t("student_settings.placeholders.select_year")}</option>
            <option value="1st Year">{t("student_settings.years.y1")}</option>
            <option value="2nd Year">{t("student_settings.years.y2")}</option>
            <option value="3rd Year">{t("student_settings.years.y3")}</option>
            <option value="4th Year">{t("student_settings.years.y4")}</option>
            <option value="5th Year">{t("student_settings.years.y5")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            {t("student_settings.labels.department")}
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder={t("student_settings.placeholders.department")}
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-card text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-secondary/30"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-widest px-1">
            {t("student_settings.labels.email")}
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-5 py-3.5 rounded-xl border border-border bg-muted/30 text-sm text-secondary focus:outline-none transition-all cursor-not-allowed"
          />
          <p className="text-xs text-secondary/60 px-1">
            {t("student_settings.hints.email_readonly")}
          </p>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-4">
          <button
            onClick={() => {
              setName(user?.name || "");
              setPhone(user?.phone || "");
              setYear(user?.year || "");
              setDepartment(user?.department || "");
              setMessage(null);
            }}
            disabled={updateProfile.isPending}
            className="px-6 py-3 rounded-xl border border-border bg-card text-sm font-bold text-secondary hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("student_settings.actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={updateProfile.isPending || !name.trim()}
            className="px-6 py-3 rounded-xl bg-primary text-background text-sm font-bold hover:bg-accent transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateProfile.isPending ? t("student_settings.actions.saving") : t("student_settings.actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
};
