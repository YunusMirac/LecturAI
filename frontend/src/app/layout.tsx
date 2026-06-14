import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

import "./globals.css";

/** Läuft synchron im <head>, bevor CSS/Body gerendert werden — eine Quelle für .dark am <html>. */
const themeInitScript = `(function(){try{var t=localStorage.getItem("lectur-theme");var d=t!=="light";document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";document.documentElement.dataset.themeReady="";}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";document.documentElement.dataset.themeReady="";}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LecturAI",
  description: "KI-gestützte Lern- und Vorlesungsplattform für Lehrkräfte und Lernende.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-full min-h-full min-w-0 flex-col overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary/25 selection:text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
