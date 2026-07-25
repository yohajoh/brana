"use client";
"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

type WishlistItem = { id: string; bookAvailable: boolean; bookDeleted: boolean };
type Props = { wishlist: WishlistItem[]; loading?: boolean };

export const WishlistSummary = ({ wishlist, loading }: Props) => {
  const { t } = useLanguage();

  const total      = wishlist.length;
  const available  = wishlist.filter(i => i.bookAvailable && !i.bookDeleted).length;
  const waiting    = wishlist.filter(i => !i.bookAvailable && !i.bookDeleted).length;
  const gone       = wishlist.filter(i => i.bookDeleted).length;

  const stats = [
    { label: String(t("student_wishlist.summary.total")),                value: total },
    { label: String(t("student_wishlist.summary.available")),             value: available },
    { label: String(t("student_wishlist.summary.currently_unavailable")), value: waiting },
    { label: String(t("student_wishlist.summary.no_longer_available")),   value: gone },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-[#e8e6e1] p-5 animate-pulse">
            <div className="h-7 w-8 bg-[#f0eeea] rounded mb-2" />
            <div className="h-3 w-24 bg-[#f0eeea] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#e8e6e1] p-5">
          <p className="text-[26px] font-serif font-black text-[#0d0d0d] leading-none">{s.value}</p>
          <p className="text-[9px] font-black text-[#0d0d0d]/35 uppercase tracking-[0.15em] mt-2">{s.label}</p>
        </div>
      ))}
    </div>
  );
};
