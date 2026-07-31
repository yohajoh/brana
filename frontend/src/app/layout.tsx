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
  title: "Brana Library — Digital & Physical Book Rental",
  description: "Brana is a modern book rental platform for any library. Search, reserve, and borrow physical and digital books online. Manage rentals, fines, and reading history from one place.",
  openGraph: {
    title: "Brana Library — Digital & Physical Book Rental",
    description: "Modern digital and physical book rental system for libraries. Borrow books online and manage your library account.",
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
