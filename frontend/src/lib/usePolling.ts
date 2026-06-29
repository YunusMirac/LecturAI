"use client";

import { useEffect, useRef } from "react";

/** Polls `load` every `intervalMs` while `enabled`. */
export function usePolling(
  load: (silent?: boolean) => void | Promise<unknown>,
  intervalMs: number,
  enabled = true,
) {
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      void loadRef.current(true);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
