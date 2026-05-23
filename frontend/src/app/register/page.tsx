"use client";

import Link from "next/link";
import { useState } from "react";

import { API_URL } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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
      setPassword("");
      setPasswordConfirm("");
    } catch {
      setError("Netzwerkfehler — läuft das Backend?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lectur-accent-violet/50 to-transparent" />

      <div className="glass-card w-full max-w-md rounded-3xl p-8 ring-1 ring-white/10">
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-[0.25em] text-lectur-accent-cyan">
          LecturAI
        </p>
        <h1 className="mb-6 text-center text-2xl font-bold">
          <span className="text-gradient-lectur">Registrieren</span>
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-lectur-muted">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-lectur-abyss/80 px-4 py-3 text-lectur-foreground outline-none ring-lectur-accent-violet-core/30 transition focus:border-lectur-accent-violet-core/50 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="role" className="mb-1 block text-sm text-lectur-muted">
              Rolle
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "student" | "teacher")}
              className="w-full rounded-xl border border-white/10 bg-lectur-abyss/80 px-4 py-3 text-lectur-foreground outline-none focus:border-lectur-accent-violet-core/50 focus:ring-2 focus:ring-lectur-accent-violet-core/30"
            >
              <option value="student">Schüler/in</option>
              <option value="teacher">Lehrkraft</option>
            </select>
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-lectur-muted">
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
              className="w-full rounded-xl border border-white/10 bg-lectur-abyss/80 px-4 py-3 text-lectur-foreground outline-none ring-lectur-accent-violet-core/30 transition focus:border-lectur-accent-violet-core/50 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="password2" className="mb-1 block text-sm text-lectur-muted">
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
              className="w-full rounded-xl border border-white/10 bg-lectur-abyss/80 px-4 py-3 text-lectur-foreground outline-none ring-lectur-accent-violet-core/30 transition focus:border-lectur-accent-violet-core/50 focus:ring-2"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-glow-primary w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Wird gesendet…" : "Konto anlegen"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-lectur-muted">
          Schon registriert?{" "}
          <Link href="/login" className="text-lectur-accent-cyan hover:underline">
            Anmelden
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-lectur-subtle hover:text-lectur-muted">
            ← Zur Startseite
          </Link>
        </p>
      </div>
    </main>
  );
}
