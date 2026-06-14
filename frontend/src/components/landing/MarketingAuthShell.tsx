"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";

import { BlobBackground } from "./BlobBackground";
import { SessionNav } from "./SessionNav";

interface MarketingAuthShellProps {
  children: ReactNode;
  /** `centered`: Login/Register vertikal zentriert. `wide`: Dashboard oben bündig. */
  mainVariant?: "centered" | "wide";
}

export function MarketingAuthShell({
  children,
  mainVariant = "centered",
}: MarketingAuthShellProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  const mainClass =
    mainVariant === "wide"
      ? "relative z-10 flex min-h-[calc(100vh-4.25rem)] w-full flex-col items-stretch px-4 py-10 sm:px-6"
      : "relative z-10 flex min-h-[calc(100vh-4.25rem)] flex-col items-center justify-center px-4 py-12 sm:px-6";

  return (
    <div className="relative min-h-screen overflow-x-hidden text-[#444444] dark:text-[#e8e8e8]">
        <BlobBackground />

        <header className="relative z-10 border-b border-white/10 bg-[#2d2d2d] text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-baseline gap-0">
              <span className="text-xl font-extrabold tracking-tight text-white">Lectur</span>
              <span className="text-xl font-extrabold tracking-tight text-sky-300">AI</span>
            </Link>

            <nav className="ml-4 flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white/90 transition hover:bg-white/10"
                aria-label="Hell- und Dunkelmodus umschalten"
              >
                {mounted ? (theme === "dark" ? "☀ Light" : "☾ Dark") : "Theme"}
              </button>
              <SessionNav tone="dark" />
            </nav>
          </div>
        </header>

        <main className={mainClass}>{children}</main>
    </div>
  );
}
