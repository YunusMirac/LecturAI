"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { API_URL } from "@/lib/api";

const cardShadow =
  "0 8px 48px color-mix(in srgb, var(--primary) 7%, rgba(0,0,0,0.1)), 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)";

const inputClass =
  "min-h-[3.5rem] w-full rounded-2xl border-2 border-border bg-secondary/35 px-5 py-4 text-lg text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/30 sm:text-xl";

const ease = [0.22, 1, 0.36, 1] as const;

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDevVerifyUrl(null);
    if (password !== passwordConfirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          password_confirm: passwordConfirm,
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const first =
          typeof data.email?.[0] === "string"
            ? data.email[0]
            : typeof data.password_confirm?.[0] === "string"
              ? data.password_confirm[0]
              : typeof data.detail === "string"
                ? data.detail
                : "Registrierung fehlgeschlagen.";
        setError(first);
        return;
      }
      setSuccess(
        typeof data.detail === "string"
          ? data.detail
          : "Registrierung erfolgreich. Bitte E-Mail bestätigen."
      );
      setDevVerifyUrl(typeof data.dev_verify_url === "string" ? data.dev_verify_url : null);
      setPassword("");
      setPasswordConfirm("");
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
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card/65 p-10 backdrop-blur-md sm:p-12"
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
          Neu hier
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
            Registrieren
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
              htmlFor="role"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              Rolle
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "student" | "teacher")}
              className={inputClass}
            >
              <option value="student">Schüler/in</option>
              <option value="teacher">Lehrkraft</option>
            </select>
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="password2"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              Passwort wiederholen
            </label>
            <input
              id="password2"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputClass}
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive sm:text-lg">
              {error}
            </p>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3 text-base text-foreground sm:text-lg">
              <p>{success}</p>
              {devVerifyUrl ? (
                <Link
                  href={devVerifyUrl}
                  className="mt-3 inline-block font-semibold text-primary underline underline-offset-4"
                >
                  Dev-Link zum Verifizieren öffnen
                </Link>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-[3.75rem] w-full rounded-2xl py-4 text-lg font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 sm:text-xl"
            style={{
              backgroundColor: "var(--primary)",
              boxShadow:
                "0 0 20px color-mix(in srgb, var(--primary) 50%, transparent), 0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            {loading ? "Wird gesendet…" : "Konto anlegen"}
          </button>
        </form>

        <p className="mt-8 text-center text-base text-muted-foreground sm:text-lg">
          Schon registriert?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Anmelden
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
