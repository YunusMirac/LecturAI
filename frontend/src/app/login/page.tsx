"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { API_URL, AUTH_ACCESS_KEY, AUTH_REFRESH_KEY } from "@/lib/api";

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
        router.push("/");
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
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lectur-accent-violet/50 to-transparent" />

      <div className="glass-card w-full max-w-md rounded-3xl p-8 ring-1 ring-white/10">
        <p className="mb-1 text-center text-xs font-medium uppercase tracking-[0.25em] text-lectur-accent-cyan">
          LecturAI
        </p>
        <h1 className="mb-6 text-center text-2xl font-bold">
          <span className="text-gradient-lectur">Anmelden</span>
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
            <label htmlFor="password" className="mb-1 block text-sm text-lectur-muted">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-lectur-abyss/80 px-4 py-3 text-lectur-foreground outline-none ring-lectur-accent-violet-core/30 transition focus:border-lectur-accent-violet-core/50 focus:ring-2"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-glow-primary w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Wird angemeldet…" : "Einloggen"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-lectur-muted">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-lectur-accent-cyan hover:underline">
            Registrieren
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
