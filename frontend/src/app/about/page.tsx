"use client";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { RxPeople } from "react-icons/rx";

import { useLanguage } from "@/components/providers/LanguageProvider";

const AboutPage = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10">
      <Navbar />
      <div className="px-4 sm:px-8 lg:px-16 flex gap-20 pt-10 items-center justify-between mb-40 max-w-7xl mx-auto">
        <div>
          <h2 className="text-4xl font-serif font-bold text-primary mb-5">
            {t("about_page.story.title")}
          </h2>
          <p className="text-[16px] max-w-171.25 leading-relaxed">
            {t("about_page.story.p1")}
            <br /> {t("about_page.story.p2")}
            <br /> {t("about_page.story.p3")}
          </p>
        </div>
        <Image
          src="/about img.jpg"
          alt="image of gibi gubae library members"
          width={1024}
          height={1024}
          className="max-w-100 rounded-2xl"
        />
      </div>

      <div className="px-4 sm:px-8 lg:px-16 pt-10 text-center mb-40 max-w-7xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-primary mb-5">
          {t("about_page.mission.title")}
        </h2>
        <p className="text-[16px] max-w-190 leading-relaxed mx-auto">
          {t("about_page.mission.description")}
        </p>
      </div>

      <div className="bg-secondary/5 h-fit mb-40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 py-12 h-fit max-w-7xl mx-auto">
          <div className="px-4 sm:px-8 lg:px-16 text-center w-full border-r-2 border-accent">
            <h3 className="text-4xl font-serif font-bold text-primary mb-5">
              200+
            </h3>
            <p className="text-[16px] leading-relaxed mx-auto">
              {t("about_page.stats.books")}
            </p>
          </div>
          <div className="px-4 sm:px-8 lg:px-16 text-center w-full border-r-2 border-accent">
            <h3 className="text-4xl font-serif font-bold text-primary mb-5">
              87
            </h3>
            <p className="text-[16px] leading-relaxed mx-auto">
              {t("about_page.stats.borrowed")}
            </p>
          </div>
          <div className="px-4 sm:px-8 lg:px-16 text-center w-full border-r-2 border-accent">
            <h3 className="text-4xl font-serif font-bold text-primary mb-5">
              12
            </h3>
            <p className="text-[16px] leading-relaxed mx-auto">
              {t("about_page.stats.members")}
            </p>
          </div>
          <div className="px-4 sm:px-8 lg:px-16 text-center ">
            <h3 className="text-4xl font-serif font-bold text-primary mb-5">
              50+
            </h3>
            <p className="text-[16px] leading-relaxed mx-auto">
              {t("about_page.stats.readers")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 lg:px-16 pt-10 text-center mb-50 flex flex-col items-center">
        <h2 className="text-4xl font-serif font-bold text-primary mb-15">
          {t("about_page.involvement.title")}
        </h2>
        <div className="flex gap-12 ">
          <div className="flex flex-col items-center w-75">
            <div className="w-fit h-fit p-4.5 rounded-full bg-black/30 translate-y-2/6">
              <Image
                src="/icons/read.svg"
                width={32}
                height={32}
                alt="read icon"
              />
            </div>
            <div className="px-4 pb-5 pt-10 text-center bg-white/50 w-full rounded-2xl shadow-xl  flex flex-col items-center gap-1">
              <h4 className="text-[24px] font-serif font-bold text-primary">
                {t("about_page.involvement.borrow.title")}
              </h4>
              <p className="text-[16px] leading-relaxed mb-4 max-w-60">
                {t("about_page.involvement.borrow.description")}
              </p>
              <Link
                href="/books"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary  py-2 text-[14px] font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
              >
                {t("about_page.involvement.cta_explore")}
                <MoveRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center w-75">
            <div className="w-fit h-fit p-4.5 rounded-full bg-black/30 translate-y-2/6">
              <Image
                src="/icons/donate.svg"
                width={32}
                height={32}
                alt="donate icon"
              />
            </div>
            <div className="px-4 pb-5 pt-10 text-center bg-white/50 w-full  rounded-2xl shadow-xl  flex flex-col items-center gap-1">
              <h4 className="text-[24px] font-serif font-bold text-primary">
                {t("about_page.involvement.donate.title")}
              </h4>
              <p className="text-[16px] leading-relaxed mb-4">
                {t("about_page.involvement.donate.description")}
              </p>
              <Link
                href="#"
                className="flex w-full items-center gap-2 rounded-lg bg-primary justify-center py-2 text-[14px] font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
              >
                {t("about_page.involvement.cta_contact")}
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center w-75">
            <div className="w-fit h-fit p-4.5 rounded-full bg-black/30 translate-y-2/6">
              <RxPeople size={32} />
            </div>
            <div className="px-4 pb-5 pt-10 text-center bg-white/50 w-full rounded-2xl shadow-xl  flex flex-col items-center gap-1">
              <h4 className="text-[24px] font-serif font-bold text-primary">
                {t("about_page.involvement.volunteer.title")}
              </h4>
              <p className="text-[16px] leading-relaxed mb-4 max-w-65">
                {t("about_page.involvement.volunteer.description")}
              </p>
              <Link
                href="#"
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-primary py-2 text-[14px] font-bold text-background shadow-xl hover:bg-accent transition-all group active:scale-95 cursor-pointer"
              >
                {t("about_page.involvement.cta_contact")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AboutPage;
