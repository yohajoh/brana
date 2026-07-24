"use client";

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MostBorrowed } from "@/components/MostBorrowed";
import { HowItWorks } from "@/components/HowItWorks";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <MostBorrowed />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
