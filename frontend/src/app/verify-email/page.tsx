import { Suspense } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";

import { VerifyEmailClient } from "./VerifyEmailClient";

const cardShadow =
  "0 8px 48px color-mix(in srgb, var(--primary) 7%, rgba(0,0,0,0.1)), 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)";

function VerifyFallback() {
  return (
    <div
      className="w-full max-w-xl rounded-2xl border border-border bg-card/65 p-12 text-center text-lg text-muted-foreground backdrop-blur-md sm:p-14"
      style={{ boxShadow: cardShadow }}
    >
      Lädt…
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <MarketingAuthShell>
      <Suspense fallback={<VerifyFallback />}>
        <VerifyEmailClient />
      </Suspense>
    </MarketingAuthShell>
  );
}
