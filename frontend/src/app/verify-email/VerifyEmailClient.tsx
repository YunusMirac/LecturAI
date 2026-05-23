"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { API_URL } from "@/lib/api";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");
    if (!uid || !token) {
      setStatus("err");
      setMessage("Ungültiger Link (uid oder token fehlt).");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
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
            typeof data.detail === "string"
              ? data.detail
              : "Bestätigung fehlgeschlagen."
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
    <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center ring-1 ring-white/10">
      <p className="mb-1 text-xs font-medium uppercase tracking-[0.25em] text-lectur-accent-cyan">
        LecturAI
      </p>
      <h1 className="mb-4 text-2xl font-bold">
        <span className="text-gradient-lectur">E-Mail bestätigen</span>
      </h1>

      {status === "loading" ? (
        <p className="text-lectur-muted">Bitte warten…</p>
      ) : status === "ok" ? (
        <p className="text-emerald-200">{message}</p>
      ) : (
        <p className="text-red-200">{message}</p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/login"
          className="btn-glow-primary inline-block rounded-xl px-5 py-2.5 text-center text-sm font-semibold"
        >
          Zum Login
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-center text-sm text-lectur-muted hover:bg-white/5"
        >
          Startseite
        </Link>
      </div>
    </div>
  );
}
