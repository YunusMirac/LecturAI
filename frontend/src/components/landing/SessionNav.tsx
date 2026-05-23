"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { AUTH_ACCESS_KEY } from "@/lib/api";
import { AUTH_CHANGED_EVENT, clearAuth, getStoredUserSession, roleLabelDe } from "@/lib/auth";

type NavSession = { authed: false } | { authed: true; email: string | null; role: string | null };

/** Muss bei jedem Aufruf identisch sein (React 19 / useSyncExternalStore). */
const SNAPSHOT_LOGGED_OUT = '{"authed":false}';

function readNavSessionSnapshot(): string {
  if (typeof window === "undefined") return SNAPSHOT_LOGGED_OUT;
  try {
    if (!sessionStorage.getItem(AUTH_ACCESS_KEY)) return SNAPSHOT_LOGGED_OUT;
    const u = getStoredUserSession();
    return JSON.stringify({
      authed: true,
      email: u?.email ?? null,
      role: u?.role ?? null,
    });
  } catch {
    return SNAPSHOT_LOGGED_OUT;
  }
}

function parseNavSnapshot(json: string): NavSession {
  if (json === SNAPSHOT_LOGGED_OUT) return { authed: false };
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (o.authed === true) {
      return {
        authed: true,
        email: o.email == null ? null : String(o.email),
        role: o.role == null ? null : String(o.role),
      };
    }
  } catch {
    /* ignore */
  }
  return { authed: false };
}

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

function getSessionSnapshot(): string {
  return readNavSessionSnapshot();
}

function getServerSessionSnapshot(): string {
  return SNAPSHOT_LOGGED_OUT;
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
  const raw = useSyncExternalStore(subscribe, getSessionSnapshot, getServerSessionSnapshot);
  const session = useMemo(() => parseNavSnapshot(raw), [raw]);
  const authed = session.authed;

  const logout = useCallback(() => {
    clearAuth();
    router.push("/");
    router.refresh();
  }, [router]);

  const userLine =
    authed && session.authed ? (
      <div
        className={
          tone === "dark"
            ? "mr-auto max-w-[min(100%,14rem)] text-left text-xs leading-tight text-white/80 sm:max-w-[20rem] sm:text-right"
            : "mr-auto max-w-[min(100%,14rem)] text-left text-xs leading-tight text-muted-foreground sm:max-w-[20rem] sm:text-right"
        }
        title={session.email ?? undefined}
      >
        <span className={tone === "dark" ? "font-semibold text-white" : "font-semibold text-foreground"}>
          {roleLabelDe(session.role)}
        </span>
        {session.email ? (
          <>
            <span className={tone === "dark" ? "text-white/50" : "text-muted-foreground/80"}> · </span>
            <span className="break-all">{session.email}</span>
          </>
        ) : null}
      </div>
    ) : null;

  if (authed) {
    if (tone === "dark") {
      return (
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {userLine}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {userLine}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
        </div>
      </div>
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
