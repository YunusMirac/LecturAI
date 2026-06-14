"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import {
  fetchInvitationPreview,
  postRegister,
  signInWithPassword,
} from "@/lib/api";
import { roleLabelDe } from "@/lib/auth";

import { inputClassAuth } from "@/lib/ui/form-classes";

const ease = [0.22, 1, 0.36, 1] as const;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken =
    searchParams.get("invite_token") ?? searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"teacher" | "student" | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(inviteToken.trim()));
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasInviteLink = Boolean(inviteToken.trim());

  useEffect(() => {
    if (!inviteToken.trim()) {
      queueMicrotask(() => setPreviewLoading(false));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      void fetchInvitationPreview(inviteToken).then((result) => {
        if (cancelled) return;
        setPreviewLoading(false);
        if (!result.ok) {
          setPreviewError(result.errorMessage);
          return;
        }
        setEmail(result.preview.email);
        setInviteRole(result.preview.role);
        setPreviewError(null);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteToken.trim()) {
      setError("Registrierung nur mit gültigem Einladungslink möglich.");
      return;
    }
    if (!email.trim()) {
      setError("E-Mail konnte nicht aus der Einladung geladen werden.");
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

      const loginResult = await signInWithPassword(result.email, password);
      if (loginResult.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuccess(`${result.detail} Bitte melde dich an.`);
      setPassword("");
      setPasswordConfirm("");
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasInviteLink) {
    return (
      <MarketingAuthShell>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="glass-panel w-full max-w-xl overflow-hidden rounded-2xl p-10 sm:p-12"
        >
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight">Registrierung</h1>
          <p className="text-lg text-muted-foreground">
            LecturAI nutzt <strong className="text-foreground">Einladungen</strong> — es gibt
            keine offene Registrierung ohne Link. Das Formular erscheint, sobald du den Link aus
            der Einladungs-E-Mail (oder aus dem Dashboard) öffnest.
          </p>
          <div className="mt-6 space-y-3 rounded-2xl border border-[#2a9d8f]/25 bg-[#2a9d8f]/8 px-4 py-4 text-sm text-muted-foreground">
            <p className="font-semibold text-[#2a9d8f]">So testest du lokal:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Admin im Supabase anlegen (siehe <code className="text-xs">docs/SUPABASE_SETUP.md</code>)</li>
              <li>Als Admin einloggen → Lehrkraft oder Schüler:in einladen</li>
              <li>Registrierungslink kopieren (Dashboard zeigt ihn, wenn E-Mail nicht versendet wurde)</li>
              <li>Diesen Link im Browser öffnen → nur Passwort setzen</li>
            </ol>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Die URL muss so aussehen:{" "}
            <code className="break-all text-xs">/register?invite_token=…</code>
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block font-semibold text-[#2a9d8f] underline underline-offset-4"
          >
            Zum Login
          </Link>
        </motion.div>
      </MarketingAuthShell>
    );
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
          Einladung
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
            Passwort setzen
          </span>
        </h1>

        {previewLoading ? (
          <p className="mb-6 text-muted-foreground">Einladung wird geladen…</p>
        ) : previewError ? (
          <p className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
            {previewError}
          </p>
        ) : (
          <div className="mb-6 rounded-2xl border border-[#2a9d8f]/25 bg-[#2a9d8f]/8 px-4 py-3 text-sm">
            {inviteRole ? (
              <p className="font-semibold text-[#2a9d8f]">
                Rolle: {roleLabelDe(inviteRole)}
              </p>
            ) : null}
            {email ? (
              <p className="mt-1 break-all text-muted-foreground">
                E-Mail: <span className="font-medium text-foreground">{email}</span>
              </p>
            ) : null}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
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
              disabled={previewLoading || Boolean(previewError)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassAuth}
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
              disabled={previewLoading || Boolean(previewError)}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputClassAuth}
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
            disabled={loading || previewLoading || Boolean(previewError) || !email}
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
