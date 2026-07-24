"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../AuthLayout";
import { fetchApi, fetchCurrentUser } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

type UserData = {
  id: string; name: string; email: string; role: string;
  student_id?: string | null; phone?: string | null;
  year?: string | null; department?: string | null;
};

const needsProfile = (u: UserData | null) =>
  !!u && u.role !== "ADMIN" && (!u.student_id || !u.phone || !u.year || !u.department);

const IC = "w-full rounded-2xl border border-[#e2e0e7] bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] outline-none focus:border-[#142b6f] focus:shadow-[0_0_0_3px_rgba(20,43,111,0.09)] transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [user, setUser]         = useState<UserData | null>(null);
  const [name, setName]         = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone]       = useState("");
  const [year, setYear]         = useState("");
  const [department, setDept]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = (await fetchCurrentUser()) as UserData | null;
      if (!u) { router.replace("/auth/login"); return; }
      if (!needsProfile(u)) {
        router.replace(u.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student"); return;
      }
      setUser(u); setName(u.name || ""); setStudentId(u.student_id || "");
      setPhone(u.phone || ""); setYear(u.year || ""); setDept(u.department || "");
      setLoading(false);
    })();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true); setError(null);
    try {
      const payload: Record<string, string | null> = {
        name: name.trim(), phone: phone.trim() || null,
        year: year.trim() || null, department: department.trim() || null,
      };
      if (!user.student_id) payload.student_id = studentId.trim();
      await fetchApi("/auth/update-me", { method: "PATCH", body: JSON.stringify(payload) });
      router.replace(user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally { setSaving(false); }
  };

  return (
    <AuthLayout
      title="Complete your profile"
      subtitle="A few more details and you're ready to start borrowing."
      badge="Last step"
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-[3px] border-[#e2e0e7] border-t-[#142b6f] animate-spin" />
        </div>
      ) : (
        <>
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* User info strip */}
          <div className="flex items-center gap-3 mb-7 p-3.5 rounded-2xl bg-[#142b6f]/04 border border-[#142b6f]/08">
            <div className="w-10 h-10 rounded-xl bg-[#142b6f] flex items-center justify-center text-white text-sm font-black shrink-0 shadow-[0_2px_8px_rgba(20,43,111,0.28)]">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#0d0d0d] truncate">{user?.name}</p>
              <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
            </div>
            <div className="ml-auto shrink-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5c518]/15 border border-[#f5c518]/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#7a5c00]">
                Google
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#374151]">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your full name" className={IC} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#374151]">Student ID</label>
                <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)}
                  required={!user?.student_id} disabled={Boolean(user?.student_id)}
                  placeholder="UGR/12345/14" className={IC} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#374151]">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+251 9xx xxx xxx" className={IC} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#374151]">Year</label>
                <input type="text" value={year} onChange={e => setYear(e.target.value)} required placeholder="e.g. 3rd Year" className={IC} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#374151]">Department</label>
                <input type="text" value={department} onChange={e => setDept(e.target.value)} required placeholder="e.g. Computer Science" className={IC} />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="w-full mt-2 rounded-2xl bg-[#142b6f] py-3.5 text-sm font-black text-white shadow-[0_4px_18px_rgba(20,43,111,0.30)] hover:shadow-[0_8px_28px_rgba(20,43,111,0.38)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving…
                </span>
              ) : "Save and continue →"}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
