import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { PersonaProvider } from "@/components/providers/PersonaProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Brana Library — ASTU Campus Book Rental",
  description: "Brana is a digital book rental platform for ASTU students. Search, reserve, and borrow physical and digital books online. Manage your rentals, fines, and reading history from one place.",
  openGraph: {
    title: "Brana Library — ASTU Campus Book Rental",
    description: "Digital and physical book rental system for ASTU students. Borrow books online, get dorm delivery, and manage your library account.",
    url: "https://brana.yohajoh.tech",
    siteName: "Brana Library",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

import { LanguageProvider } from "@/components/providers/LanguageProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${playfair.variable} antialiased`}>
        <QueryProvider>
          <SocketProvider>
            <LanguageProvider>
              <PersonaProvider>
                <ToastProvider />
                {children}
              </PersonaProvider>
            </LanguageProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
