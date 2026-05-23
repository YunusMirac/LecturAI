"use client";

import { motion } from "framer-motion";

/**
 * Weiche Leucht-Flecken ohne `filter: blur()` auf großen Rechtecken — das vermeidet
 * typische Artefakte (rechteckiger Clip, „eckige“ Kanten oben links bei `overflow-hidden`).
 */
export function BlobBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 min-h-full min-w-0"
      aria-hidden
    >
      {/* Primary — oben links (weich, ohne Viewport-Rechteck-Clip) */}
      <motion.div
        className="absolute left-[-12%] top-[-8%] h-[min(120vw,52rem)] w-[min(120vw,52rem)] max-w-none rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 42%, color-mix(in srgb, var(--primary) 42%, transparent) 0%, color-mix(in srgb, var(--primary) 12%, transparent) 32%, transparent 62%)",
        }}
        animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Accent — rechts Mitte */}
      <motion.div
        className="absolute right-[-18%] top-[28%] h-[min(90vw,36rem)] w-[min(90vw,36rem)] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 48% 48%, color-mix(in srgb, var(--accent) 32%, transparent) 0%, color-mix(in srgb, var(--accent) 10%, transparent) 35%, transparent 58%)",
        }}
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.08, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
      />
      {/* Primary — unten */}
      <motion.div
        className="absolute bottom-[-20%] left-[18%] h-[min(85vw,34rem)] w-[min(85vw,34rem)] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--primary) 28%, transparent) 0%, color-mix(in srgb, var(--primary) 8%, transparent) 38%, transparent 62%)",
        }}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 5 }}
      />
    </div>
  );
}
