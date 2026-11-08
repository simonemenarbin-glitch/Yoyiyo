import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Source_Sans_3({
  variable: "--font-sans-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rotta ERP — Gestionale cloud per agenzie e tour operator",
  description:
    "Piattaforma SaaS multi-tenant: vendita multi-canale, catalogo, pratiche, CRM e reporting.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full antialiased [font-family:var(--font-sans-ui),system-ui,sans-serif]">
        {children}
      </body>
    </html>
  );
}
