"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { postRegister } from "@/lib/api";

const inputClass =
  "min-h-[3.5rem] w-full rounded-2xl border-2 border-[#e0e0e0] bg-white/50 px-5 py-4 text-lg text-[#333333] outline-none transition placeholder:text-[#999999] focus:border-[#2a9d8f] focus:ring-4 focus:ring-[#2a9d8f]/20 sm:text-xl dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-100";

const ease = [0.22, 1, 0.36, 1] as const;

function RegisterForm() {
  const searchParams = useSearchParams();
  const [inviteToken, setInviteToken] = useState(
    () => searchParams.get("invite_token") ?? searchParams.get("token") ?? "",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!inviteToken.trim()) {
      setError("Einladungstoken fehlt. Nutze den Link aus deiner Einladungs-E-Mail (?invite_token=…).");
      return;
    }
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
      const result = await postRegister({
        inviteToken: inviteToken.trim(),
        email,
        password,
        passwordConfirm,
      });
      if (!result.ok) {
        setError(result.errorMessage);
        return;
      }
      setSuccess(result.detail);
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
          Einladung erforderlich
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
              htmlFor="invite_token"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              Einladungstoken
            </label>
            <input
              id="invite_token"
              type="text"
              autoComplete="off"
              required
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Aus dem Einladungs-Link"
              className={inputClass}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Registrierung nur mit gültigem Token. Der Link aus der E-Mail füllt das Feld oft automatisch.
            </p>
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-base font-semibold text-muted-foreground sm:text-lg"
            >
              E-Mail (wie in der Einladung)
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
              <Link
                href="/login"
                className="mt-4 inline-block font-semibold text-[#2a9d8f] underline underline-offset-4"
              >
                Zum Login
              </Link>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-[3.75rem] w-full rounded-2xl bg-[#2a9d8f] py-4 text-lg font-bold text-white transition hover:brightness-110 disabled:opacity-50 sm:text-xl"
            style={{
              boxShadow: "0 6px 24px rgb(42 157 143 / 0.35)",
            }}
          >
            {loading ? "Wird gesendet…" : "Konto anlegen"}
          </button>
        </form>

        <p className="mt-8 text-center text-base text-[#666666] sm:text-lg dark:text-zinc-400">
          Schon registriert?{" "}
          <Link href="/login" className="font-semibold text-[#2a9d8f] hover:underline">
            Anmelden
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-base text-[#666666] transition hover:text-[#333333] sm:text-lg dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Zur Startseite
          </Link>
        </p>
      </motion.div>
    </MarketingAuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <MarketingAuthShell>
          <div className="glass-panel mx-auto w-full max-w-xl rounded-2xl p-12 text-center text-muted-foreground">
            Lädt…
          </div>
        </MarketingAuthShell>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
