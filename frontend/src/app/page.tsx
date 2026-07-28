"use client";
import type { Metadata } from "next";
import { Navbar }                   from "@/components/Navbar";
import { Hero }                     from "@/components/Hero";
import { StatsBand }                from "@/components/StatsBand";
import { MostBorrowed }             from "@/components/MostBorrowed";
import { CategoriesAndHowItWorks }  from "@/components/CategoriesAndHowItWorks";
import { FAQ }                      from "@/components/FAQ";
import { CTA }                      from "@/components/CTA";
import { Footer }                   from "@/components/Footer";

export const metadata: Metadata = {
  title: "Brana Library — ASTU Campus Book Rental System",
  description: "Brana Library is a digital and physical book rental platform built for ASTU students. Borrow books online, track rentals, pay fines, and access digital titles — all in one place.",
  openGraph: {
    title: "Brana Library — ASTU Campus Book Rental System",
    description: "Brana Library is a book rental platform for ASTU students. Search the catalog, reserve books, get dorm delivery, and read digital titles online.",
    url: "https://brana.yohajoh.tech",
    siteName: "Brana Library",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <StatsBand />
        <MostBorrowed />
        <CategoriesAndHowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
