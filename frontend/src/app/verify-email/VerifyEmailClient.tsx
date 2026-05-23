"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { API_URL } from "@/lib/api";

function normalizeConsoleQuotedPrintableParam(value: string) {
  return value.replace(/=\s+/g, "").replace(/^3D/, "");
}

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
      className="glass-panel w-full max-w-xl overflow-hidden rounded-2xl p-10 text-center sm:p-12"
    >
      <span
        className="mb-5 inline-block rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-widest"
        style={{
          border: "1px solid rgb(42 157 143 / 0.35)",
          color: "#2a9d8f",
          backgroundColor: "rgb(42 157 143 / 0.08)",
        }}
      >
        E-Mail
      </span>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#777777] sm:text-base dark:text-zinc-400">
        LecturAI
      </p>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
        <span
          style={{
            background: "linear-gradient(92deg, #2a6f66 0%, #2a9d8f 45%, #f5c542 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Bestätigung
        </span>
      </h1>

      {status === "loading" ? (
        <p className="text-lg text-[#666666] sm:text-xl dark:text-zinc-400">Bitte warten…</p>
      ) : status === "ok" ? (
        <p className="text-lg text-[#333333] sm:text-xl dark:text-zinc-100">{message}</p>
      ) : (
        <p className="text-lg text-red-600 sm:text-xl dark:text-red-400">{message}</p>
      )}

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/login"
          className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl bg-[#2a9d8f] px-8 py-4 text-center text-lg font-bold text-white transition hover:brightness-110 sm:text-xl"
          style={{
            boxShadow: "0 6px 24px rgb(42 157 143 / 0.35)",
          }}
        >
          Zum Login
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl border-2 border-[#e0e0e0] bg-white/40 px-8 py-4 text-center text-lg font-semibold text-[#666666] transition hover:border-[#2a9d8f]/40 hover:text-[#2a9d8f] sm:text-xl dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-300 dark:hover:border-teal-400/40"
        >
          Startseite
        </Link>
      </div>
    </motion.div>
  );
}
