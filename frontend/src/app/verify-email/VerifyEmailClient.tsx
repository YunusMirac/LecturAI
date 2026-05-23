"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { API_URL } from "@/lib/api";

function normalizeConsoleQuotedPrintableParam(value: string) {
  return value.replace(/=\s+/g, "").replace(/^3D/, "");
}

const cardShadow =
  "0 8px 48px color-mix(in srgb, var(--primary) 7%, rgba(0,0,0,0.1)), 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)";

const ease = [0.22, 1, 0.36, 1] as const;

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rawUid = searchParams.get("uid");
    const rawToken = searchParams.get("token");
    const uid = rawUid ? normalizeConsoleQuotedPrintableParam(rawUid) : null;
    const token = rawToken ? normalizeConsoleQuotedPrintableParam(rawToken) : null;

    let cancelled = false;
    (async () => {
      try {
        if (!uid || !token) {
          setStatus("err");
          setMessage("Ungültiger Link (uid oder token fehlt).");
          return;
        }

        const pathUid = encodeURIComponent(uid);
        const pathToken = encodeURIComponent(token);
        const res = await fetch(
          `${API_URL}/api/auth/verify-email/${pathUid}/${pathToken}/`,
          { method: "GET" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setStatus("ok");
          setMessage(typeof data.detail === "string" ? data.detail : "E-Mail bestätigt.");
        } else {
          setStatus("err");
          setMessage(
            typeof data.detail === "string" ? data.detail : "Bestätigung fehlgeschlagen."
          );
        }
      } catch {
        if (!cancelled) {
          setStatus("err");
          setMessage("Netzwerkfehler — läuft das Backend?");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card/65 p-10 text-center backdrop-blur-md sm:p-12"
      style={{ boxShadow: cardShadow }}
    >
      <span
        className="mb-5 inline-block rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-widest"
        style={{
          border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
          color: "var(--primary)",
          backgroundColor: "color-mix(in srgb, var(--primary) 9%, transparent)",
        }}
      >
        E-Mail
      </span>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground sm:text-base">
        LecturAI
      </p>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
        <span
          style={{
            background: "linear-gradient(92deg, var(--primary) 0%, var(--accent) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Bestätigung
        </span>
      </h1>

      {status === "loading" ? (
        <p className="text-lg text-muted-foreground sm:text-xl">Bitte warten…</p>
      ) : status === "ok" ? (
        <p className="text-lg text-foreground sm:text-xl">{message}</p>
      ) : (
        <p className="text-lg text-destructive sm:text-xl">{message}</p>
      )}

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/login"
          className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl px-8 py-4 text-center text-lg font-bold text-primary-foreground transition hover:brightness-110 sm:text-xl"
          style={{
            backgroundColor: "var(--primary)",
            boxShadow:
              "0 0 18px color-mix(in srgb, var(--primary) 45%, transparent), 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          Zum Login
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl border-2 border-border px-8 py-4 text-center text-lg font-semibold text-muted-foreground transition hover:border-primary hover:text-primary sm:text-xl"
        >
          Startseite
        </Link>
      </div>
    </motion.div>
  );
}
