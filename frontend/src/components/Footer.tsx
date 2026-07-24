"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";
import { Facebook, Twitter, Instagram } from "lucide-react";
import { RiTiktokLine } from "react-icons/ri";
import { LiaTelegram } from "react-icons/lia";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export const Footer = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  // Fetch categories for footer links (real data)
  const { data: catData } = useQuery({
    queryKey: ["footer-categories"],
    queryFn: () => fetchApi("/categories?limit=5"),
    staleTime: 30 * 60 * 1000,
  });
  const categories = (catData as { categories?: Array<{ id: string; name: string; slug: string }> })?.categories ?? [];

  return (
    <footer className="w-full bg-[#0a0a0a] text-white">
      {/* Top editorial bar */}
      <div className="border-b border-white/06 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icons/icon.png" alt="Brana" width={36} height={36} className="rounded-xl" />
            <span className="text-2xl font-serif font-black text-white">ብራና</span>
          </Link>
          <p className="text-sm text-white/40 max-w-sm">
            {t("footer.description") as string}
          </p>
          <div className="flex items-center gap-2">
            {[Facebook, Twitter, Instagram, RiTiktokLine, LiaTelegram].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-xl bg-white/05 flex items-center justify-center text-white/40 hover:text-white hover:bg-[#142b6f] transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main links grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5">
              {t("footer.links_title") as string}
            </h5>
            <nav className="flex flex-col gap-3">
              {[
                { href: "/", label: t("navbar.home") as string },
                { href: "/books", label: t("navbar.books") as string },
                { href: "/about", label: t("navbar.about") as string },
                { href: "/auth/create-account", label: "Sign Up" },
                { href: "/auth/login", label: "Log In" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-sm text-white/45 hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5">
              Categories
            </h5>
            <nav className="flex flex-col gap-3">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/books?category_id=${cat.id}`}
                    className="text-sm text-white/45 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))
              ) : (
                ["Theology", "Literature", "Technology", "Leadership", "History"].map((name) => (
                  <span key={name} className="text-sm text-white/30">{name}</span>
                ))
              )}
            </nav>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5">
              {t("footer.contact_title") as string}
            </h5>
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-2.5">
                <Phone size={13} className="text-[#f5c518] mt-0.5 shrink-0" />
                <span className="text-sm text-white/45">+251 987 654 321</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={13} className="text-[#f5c518] mt-0.5 shrink-0" />
                <span className="text-sm text-white/45">hello@birana.com</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={13} className="text-[#f5c518] mt-0.5 shrink-0" />
                <span className="text-sm text-white/45">ASTU, Adama, Ethiopia</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5">
              Legal
            </h5>
            <nav className="flex flex-col gap-3">
              <Link href="/privacy-policy" className="text-sm text-white/45 hover:text-white transition-colors">
                {t("footer.privacy") as string}
              </Link>
              <Link href="/terms-of-service" className="text-sm text-white/45 hover:text-white transition-colors">
                {t("footer.terms") as string}
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/05 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-[11px] text-white/25 text-center">
            &copy; {year} Birana Library System — Adama Science &amp; Technology University.{" "}
            {t("footer.rights") as string}
          </p>
        </div>
      </div>
    </footer>
  );
};
