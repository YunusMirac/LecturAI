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
export function SessionNav() {
  const router = useRouter();
  const authed = useSyncExternalStore(subscribe, getSessionSnapshot, getServerSessionSnapshot);

  const logout = useCallback(() => {
    clearAuth();
    router.push("/");
    router.refresh();
  }, [router]);

  if (authed) {
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
