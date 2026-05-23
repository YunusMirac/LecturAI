"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { API_URL, AUTH_ACCESS_KEY, AUTH_REFRESH_KEY } from "@/lib/api";
import { AUTH_CHANGED_EVENT } from "@/lib/auth";

const inputClass =
  "min-h-[3.5rem] w-full rounded-2xl border-2 border-[#e0e0e0] bg-white/50 px-5 py-4 text-lg text-[#333333] outline-none transition placeholder:text-[#999999] focus:border-[#2a9d8f] focus:ring-4 focus:ring-[#2a9d8f]/20 sm:text-xl dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-100";

const ease = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.non_field_errors)
              ? data.non_field_errors[0]
              : "Anmeldung fehlgeschlagen.";
        setError(msg);
        return;
      }
      if (data.access && data.refresh) {
        sessionStorage.setItem(AUTH_ACCESS_KEY, data.access);
        sessionStorage.setItem(AUTH_REFRESH_KEY, data.refresh);
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setError("Unerwartete Antwort vom Server.");
    } catch {
      setError("Netzwerkfehler — läuft das Backend?");
    } finally {
      setLoading(false);
    }
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
          Konto
        </span>
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground sm:text-base">
          LecturAI
        </p>
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          <span
            style={{
              background: "linear-gradient(92deg, var(--primary) 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Anmelden
          </span>
        </h1>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive sm:text-lg">
              {error}
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
            {loading ? "Wird angemeldet…" : "Einloggen"}
          </button>
        </form>

        <p className="mt-8 text-center text-base text-muted-foreground sm:text-lg">
          Noch kein Konto?{" "}
          <Link href="/register" className="font-semibold text-[#2a9d8f] hover:underline">
            Registrieren
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-base text-muted-foreground transition hover:text-foreground sm:text-lg"
          >
            ← Zur Startseite
          </Link>
        </p>
      </motion.div>
    </MarketingAuthShell>
  );
}
