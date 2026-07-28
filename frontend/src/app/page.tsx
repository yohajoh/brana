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
      <Navbar />
      <main className="flex-1">
        <Hero />
        <StatsBand />
        {/* App identity section — visible to both users and crawlers */}
        <section className="bg-white py-10 px-4 text-center">
          <h2 className="text-2xl font-serif font-black text-[#142b6f] mb-2">
            Brana Library
          </h2>
          <p className="text-sm text-[#374151] max-w-xl mx-auto leading-relaxed">
            Brana Library is a digital and physical book rental platform for ASTU students.
            Search our catalog, reserve books online, get dorm delivery, pay fines, and
            read digital titles — all in one place.
          </p>
        </section>
        <MostBorrowed />
        <CategoriesAndHowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
