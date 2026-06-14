"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchCourseMembers,
  removeCourseMember,
  type CourseMember,
  type CourseMembersPayload,
} from "@/lib/api/courseMembersApi";

type CourseMembersSectionProps = {
  courseId: string;
  refreshKey?: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusBadge(member: CourseMember) {
  if (member.status === "registered") {
    return (
      <span className="rounded-full bg-[#2a9d8f]/15 px-2.5 py-0.5 text-xs font-semibold text-[#2a9d8f] dark:bg-teal-900/40 dark:text-teal-200">
        Registriert
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      Einladung offen
    </span>
  );
}

export function CourseMembersSection({ courseId, refreshKey = 0 }: CourseMembersSectionProps) {
  const [payload, setPayload] = useState<CourseMembersPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionMsg(null);
    const result = await fetchCourseMembers(courseId);
    setLoading(false);
    if (!result.ok) {
      setPayload(null);
      if (result.reason === "forbidden") {
        setError("Keine Berechtigung für diese Kursliste.");
      } else if (result.reason === "not_found") {
        setError("Kurs nicht gefunden.");
      } else {
        setError(result.message ?? "Mitgliederliste konnte nicht geladen werden.");
      }
      return;
    }
    setPayload(result.data);
  }, [courseId]);

  async function onRemoveMember(member: CourseMember) {
    const actionLabel =
      member.status === "registered"
        ? `${member.email} aus dem Kurs entfernen?\n\nDas Login-Konto bleibt bestehen.`
        : `Einladung für ${member.email} widerrufen?`;
    if (!window.confirm(actionLabel)) return;

    setRemovingEmail(member.email);
    setError(null);
    setActionMsg(null);
    const result = await removeCourseMember(courseId, member.email);
    setRemovingEmail(null);
    if (!result.ok) {
      setError(result.message ?? "Entfernen fehlgeschlagen.");
      return;
    }
    setActionMsg(result.detail);
    await loadMembers();
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadMembers();
    });
  }, [loadMembers, refreshKey]);

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Schüler:innen im Kurs</h3>
      <p className="mb-4 text-sm text-[#666666] dark:text-zinc-400">
        Registrierte Teilnehmer:innen und offene Einladungen. Entfernen heißt: aus dem Kurs
        nehmen — nicht das Konto löschen.
      </p>

      {loading ? (
        <p className="text-sm text-[#666666] dark:text-zinc-400">Lade Mitglieder…</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      ) : payload ? (
        <>
          {actionMsg ? (
            <p className="mb-4 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">{actionMsg}</p>
          ) : null}
          <div className="mb-4 flex flex-wrap gap-3 text-sm text-[#666666] dark:text-zinc-400">
            <span>
              <strong className="text-[#333333] dark:text-zinc-200">{payload.counts.registered}</strong>{" "}
              registriert
            </span>
            <span>·</span>
            <span>
              <strong className="text-[#333333] dark:text-zinc-200">{payload.counts.pending}</strong>{" "}
              Einladung offen
            </span>
          </div>

          {payload.members.length === 0 ? (
            <p className="text-sm text-[#666666] dark:text-zinc-400">
              Noch keine Schüler:innen — lade jemanden über das Formular oben ein.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/30 text-xs uppercase tracking-wide text-[#777777] dark:border-white/10 dark:text-zinc-500">
                    <th className="pb-2 pr-4 font-semibold">E-Mail</th>
                    <th className="pb-2 pr-4 font-semibold">Status</th>
                    <th className="pb-2 pr-4 font-semibold">Seit / Eingeladen</th>
                    <th className="pb-2 font-semibold">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.members.map((member) => (
                    <tr
                      key={member.email}
                      className="border-b border-white/15 last:border-0 dark:border-white/5"
                    >
                      <td className="py-2 pr-4 font-medium text-[#333333] dark:text-zinc-200">
                        {member.email}
                      </td>
                      <td className="py-2 pr-4">{statusBadge(member)}</td>
                      <td className="py-2 pr-4 text-[#666666] dark:text-zinc-400">
                        {member.status === "registered"
                          ? formatDate(member.joined_at)
                          : formatDate(member.invited_at)}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          disabled={removingEmail === member.email}
                          onClick={() => void onRemoveMember(member)}
                          className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                        >
                          {removingEmail === member.email
                            ? "…"
                            : member.status === "registered"
                              ? "Entfernen"
                              : "Widerrufen"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
