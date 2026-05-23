import { Suspense } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";

import { VerifyEmailClient } from "./VerifyEmailClient";

function VerifyFallback() {
  return (
    <div className="glass-panel w-full max-w-xl rounded-2xl p-12 text-center text-lg text-[#666666] sm:p-14 dark:text-zinc-400">
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
