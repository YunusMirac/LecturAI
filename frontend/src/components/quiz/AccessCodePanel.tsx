"use client";

import { Copy } from "lucide-react";

type AccessCodePanelProps = {
  code: string;
  onCopy: () => void;
};

export function AccessCodePanel({ code, onCopy }: AccessCodePanelProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/8 px-4 py-3">
      <span className="text-sm text-[#666666] dark:text-zinc-400">Zugangscode:</span>
      <span className="font-mono text-2xl font-extrabold tracking-widest text-[#2a9d8f]">
        {code}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 rounded-lg border border-[#2a9d8f]/30 px-3 py-1.5 text-xs font-semibold text-[#2a9d8f] hover:bg-[#2a9d8f]/10"
      >
        <Copy className="h-3.5 w-3.5" />
        Kopieren
      </button>
    </div>
  );
}
