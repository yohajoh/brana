import { Navbar }                   from "@/components/Navbar";
import { Hero }                     from "@/components/Hero";
import { StatsBand }                from "@/components/StatsBand";
import { MostBorrowed }             from "@/components/MostBorrowed";
import { CategoriesAndHowItWorks }  from "@/components/CategoriesAndHowItWorks";
import { FAQ }                      from "@/components/FAQ";
import { CTA }                      from "@/components/CTA";
import { Footer }                   from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] flex flex-col">
      {/* Static content for search engine crawlers */}
      <h1 className="sr-only">Brana Library — ASTU Campus Book Rental System</h1>
      <p className="sr-only">
        Brana Library is a digital and physical book rental platform for ASTU students.
        Search our catalog, reserve books online, get dorm delivery, pay fines, and
        read digital titles — all in one place.
      </p>
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
