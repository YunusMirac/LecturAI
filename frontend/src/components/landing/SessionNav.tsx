"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { AUTH_ACCESS_KEY } from "@/lib/api";
import { AUTH_CHANGED_EVENT, clearAuth } from "@/lib/auth";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const fn = () => onStoreChange();
  window.addEventListener("storage", fn);
  window.addEventListener(AUTH_CHANGED_EVENT, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(AUTH_CHANGED_EVENT, fn);
  };
}

function getSessionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!sessionStorage.getItem(AUTH_ACCESS_KEY);
  } catch {
    return false;
  }
}

function getServerSessionSnapshot(): boolean {
  return false;
}

/**
 * Login/Registrieren oder Dashboard/Abmelden — abhängig von Session-Token.
 */
interface SessionNavProps {
  /** Auf dunkler Topbar (z. B. Lectur-Hub-Stil) helle Linkfarben. */
  tone?: "light" | "dark";
}

export function SessionNav({ tone = "light" }: SessionNavProps) {
  const router = useRouter();
  const authed = useSyncExternalStore(subscribe, getSessionSnapshot, getServerSessionSnapshot);

  const logout = useCallback(() => {
    clearAuth();
    router.push("/");
    router.refresh();
  }, [router]);

  if (authed) {
    if (tone === "dark") {
      return (
        <>
          <Link
            href="/dashboard"
            className="rounded-lg border border-transparent bg-[#2a9d8f] px-4 py-2 text-sm font-bold text-white shadow-[0_6px_22px_rgb(42_157_143_/_0.38)] transition hover:brightness-110"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            Abmelden
          </button>
        </>
      );
    }
    return (
      <>
        <Link
          href="/dashboard"
          className="rounded-lg border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_35%,transparent)] transition hover:brightness-110"
        >
          Dashboard
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
        >
          Abmelden
        </button>
      </>
    );
  }

  if (tone === "dark") {
    return (
      <>
        <Link
          href="/login"
          className="rounded-lg border border-white/35 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-transparent bg-[#f5c542] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-[#3a3a3a] shadow-[0_2px_0_rgb(0_0_0_/_0.14)] transition hover:brightness-105"
        >
          Registrieren
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="rounded-lg border-2 border-primary px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="rounded-lg px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-accent-foreground transition hover:brightness-110 active:scale-95"
        style={{
          backgroundColor: "var(--accent)",
          boxShadow:
            "0 3px 0 color-mix(in srgb, var(--accent-foreground) 18%, transparent), 0 6px 18px color-mix(in srgb, var(--accent) 40%, transparent)",
        }}
      >
        Registrieren
      </Link>
    </>
  );
}
