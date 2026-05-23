import { Suspense } from "react";

import { VerifyEmailClient } from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lectur-accent-violet/50 to-transparent" />
      <Suspense
        fallback={
          <div className="glass-card w-full max-w-md rounded-3xl p-8 text-center text-lectur-muted ring-1 ring-white/10">
            Lädt…
          </div>
        }
      >
        <VerifyEmailClient />
      </Suspense>
    </main>
  );
}
