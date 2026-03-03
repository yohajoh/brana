import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brana",
  description: "Brana - automated book rental system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
      >
        {children}
      </body>
    </html>
  );
}
