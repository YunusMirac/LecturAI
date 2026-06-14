"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { requestPasswordReset } from "@/lib/api";

import { inputClassAuth } from "@/lib/ui/form-classes";

const ease = [0.22, 1, 0.36, 1] as const;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.errorMessage);
      return;
    }
    setSuccess(result.detail);
    setEmail("");
  }

  return (
    <MarketingAuthShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="glass-panel w-full max-w-xl overflow-hidden rounded-2xl p-10 sm:p-12"
      >
        <span
          className="mb-5 inline-block rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-widest"
          style={{
            border: "1px solid rgb(42 157 143 / 0.35)",
            color: "#2a9d8f",
            backgroundColor: "rgb(42 157 143 / 0.08)",
          }}
        >
          Passwort vergessen
        </span>
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground sm:text-base">
          LecturAI
        </p>
        <h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          <span
            style={{
              background: "linear-gradient(92deg, var(--primary) 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Link anfordern
          </span>
        </h1>
        <p className="mb-8 text-base text-muted-foreground sm:text-lg">
          Gib deine E-Mail ein. Du erhältst einen Link zum Setzen eines neuen Passworts.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              E-Mail
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassAuth}
              placeholder="deine@schule.de"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive sm:text-lg">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-base text-[#1a5c54] dark:text-teal-200 sm:text-lg">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-[3.75rem] w-full rounded-2xl bg-[#2a9d8f] py-4 text-lg font-bold text-white transition hover:brightness-110 disabled:opacity-50 sm:text-xl"
            style={{
              boxShadow: "0 6px 24px rgb(42 157 143 / 0.35)",
            }}
          >
            {loading ? "Wird gesendet…" : "Link senden"}
          </button>
        </form>

        <p className="mt-8 text-center text-base text-muted-foreground sm:text-lg">
          <Link href="/login" className="font-semibold text-[#2a9d8f] transition hover:underline">
            ← Zurück zur Anmeldung
          </Link>
        </p>
      </motion.div>
    </MarketingAuthShell>
  );
}
