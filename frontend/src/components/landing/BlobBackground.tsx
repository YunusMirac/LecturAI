"use client";

/**
 * Statisches Pastell-Mesh (Pfirsich, Lavendel, Mint, Gelb) — wie BHT-Hub-Referenz,
 * ohne animierte Blobs, damit die Farben ruhig und nah am Screenshot bleiben.
 */
export function BlobBackground() {
  return (
    <div
      className="bg-bht-mesh pointer-events-none fixed inset-0 z-0 min-h-full min-w-0"
      aria-hidden
    />
  );
}
