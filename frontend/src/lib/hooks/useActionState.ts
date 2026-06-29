"use client";

import { useState } from "react";

export function useActionState() {
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearActions() {
    setActionMsg(null);
    setActionErr(null);
  }

  return {
    actionMsg,
    actionErr,
    busy,
    setActionMsg,
    setActionErr,
    setBusy,
    clearActions,
  };
}
