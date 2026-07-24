"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react";
import { RiTiktokLine } from "react-icons/ri";
import { LiaTelegram } from "react-icons/lia";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";

export const Footer = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  /* Real categories from API */
  const { data: catData } = useQuery({
    queryKey: ["footer-categories"],
    queryFn: () => fetchApi("/categories?limit=5"),
    staleTime: 30 * 60 * 1000,
  });
  const categories = (catData as {
    categories?: Array<{ id: string; name: string }>;
  })?.categories ?? [];

  const socials = [
    { icon: Facebook,    href: "#", label: "Facebook"  },
    { icon: Twitter,     href: "#", label: "Twitter"   },
    { icon: Instagram,   href: "#", label: "Instagram" },
    { icon: RiTiktokLine, href: "#", label: "TikTok"   },
    { icon: LiaTelegram, href: "#", label: "Telegram"  },
  ];

  return (
    <footer className="w-full bg-[#070a12] text-white overflow-hidden">

      {/* ── Top brand bar with accent line ────────────── */}
      <div className="relative">
        {/* Gold accent line across the top */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#f5c518]/60 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">

            {/* Logo + tagline */}
            <div className="flex-1">
              <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
                <div className="relative w-10 h-10 shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-[#142b6f] shadow-[0_2px_12px_rgba(20,43,111,0.5)]" />
                  <div className="absolute top-0 right-0 w-3 h-3 bg-[#f5c518] rounded-tr-xl rounded-bl-lg" />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-serif font-black text-sm select-none">ብ</span>
                </div>
                <span className="text-2xl font-serif font-black text-white tracking-tight">ብራና</span>
              </Link>
              <p className="text-sm text-white/38 max-w-xs leading-relaxed">
                {t("footer.description") as string}
              </p>
            </div>

            {/* Newsletter-style email prompt */}
            <div className="flex-1 lg:max-w-xs">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                {t("footer.contact_title") as string}
              </p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Mail size={13} className="text-[#f5c518] shrink-0" />
                  <span className="text-sm text-white/50">hello@birana.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={13} className="text-[#f5c518] shrink-0" />
                  <span className="text-sm text-white/50">+251 987 654 321</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={13} className="text-[#f5c518] shrink-0" />
                  <span className="text-sm text-white/50">ASTU, Adama, Ethiopia</span>
                </div>
              </div>
            </div>

            {/* Socials */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Social</p>
              <div className="flex items-center gap-2">
                {socials.map(({ icon: Icon, href, label }) => (
                  <motion.a
                    key={label}
                    href={href}
                    aria-label={label}
                    whileHover={{ scale: 1.12, y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    className="w-9 h-9 rounded-xl bg-white/05 border border-white/08 flex items-center justify-center text-white/40 hover:text-white hover:bg-[#142b6f] hover:border-[#142b6f] transition-colors"
                  >
                    <Icon size={15} />
                  </motion.a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div className="h-px bg-white/05 mx-4 sm:mx-6" />

      {/* ── Main links grid ───────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12">

          {/* Quick links */}
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/28 mb-4">
              {t("footer.links_title") as string}
            </h5>
            <nav className="flex flex-col gap-2.5">
              {[
                { href: "/",      label: t("navbar.home")  as string },
                { href: "/books", label: t("navbar.books") as string },
                { href: "/about", label: t("navbar.about") as string },
                { href: "/auth/create-account", label: t("footer.signup") as string },
                { href: "/auth/login",          label: t("footer.login")  as string },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-white/42 hover:text-white transition-colors w-fit"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Categories — real data */}
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/28 mb-4">
              {t("footer.categories_title") as string}
            </h5>
            <nav className="flex flex-col gap-2.5">
              {categories.length > 0
                ? categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/books?category_id=${cat.id}`}
                      className="text-sm text-white/42 hover:text-white transition-colors w-fit"
                    >
                      {cat.name}
                    </Link>
                  ))
                : ["—", "—", "—", "—"].map((_, i) => (
                    <span key={i} className="text-sm text-white/18 h-4 w-20 rounded bg-white/05 animate-pulse" />
                  ))}
            </nav>
          </div>

          {/* Empty spacer column on sm only (keeps grid clean) */}
          <div className="hidden sm:block" />

          {/* Legal */}
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/28 mb-4">
              {t("footer.legal_title") as string}
            </h5>
            <nav className="flex flex-col gap-2.5">
              <Link href="/privacy-policy" className="text-sm text-white/42 hover:text-white transition-colors w-fit">
                {t("footer.privacy") as string}
              </Link>
              <Link href="/terms-of-service" className="text-sm text-white/42 hover:text-white transition-colors w-fit">
                {t("footer.terms") as string}
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────── */}
      <div className="border-t border-white/04">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/22">
            &copy; {year} Birana Library System — Adama Science &amp; Technology University.
          </p>
          <p className="text-[11px] text-white/22">
            {t("footer.rights") as string}
          </p>
        </div>
      </div>
    </footer>
  );
};
