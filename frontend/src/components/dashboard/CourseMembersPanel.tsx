"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCourseMembers, removeCourseMember, type CourseMember, type CourseMembersPayload } from "@/lib/api/courseMembersApi";
import type { Course } from "@/lib/api/coursesApi";

const selectClass =
  "w-full rounded-xl border border-white/50 bg-white/50 px-4 py-3 text-sm text-[#333333] outline-none transition placeholder:text-[#999999] focus:border-[#2a9d8f] dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-100";

type CourseMembersPanelProps = {
  courses: Course[];
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

export function CourseMembersPanel({ courses, refreshKey = 0 }: CourseMembersPanelProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [payload, setPayload] = useState<CourseMembersPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const loadMembers = useCallback(async (courseId: string) => {
    if (!courseId) {
      setPayload(null);
      setError(null);
      return;
    }
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
  }, []);

  async function onRemoveMember(member: CourseMember) {
    if (!selectedCourseId) return;
    const actionLabel =
      member.status === "registered"
        ? `${member.email} aus dem Kurs entfernen?\n\nDas Login-Konto bleibt bestehen.`
        : `Einladung für ${member.email} widerrufen?`;
    if (!window.confirm(actionLabel)) return;

    setRemovingEmail(member.email);
    setError(null);
    setActionMsg(null);
    const result = await removeCourseMember(selectedCourseId, member.email);
    setRemovingEmail(null);
    if (!result.ok) {
      setError(result.message ?? "Entfernen fehlgeschlagen.");
      return;
    }
    setActionMsg(result.detail);
    await loadMembers(selectedCourseId);
  }

  useEffect(() => {
    if (courses.length === 1 && !selectedCourseId) {
      queueMicrotask(() => setSelectedCourseId(courses[0]!.id));
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) return;
    queueMicrotask(() => {
      void loadMembers(selectedCourseId);
    });
  }, [selectedCourseId, loadMembers, refreshKey]);

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Schüler:innen im Kurs</h3>
      <p className="mb-4 text-sm text-[#666666] dark:text-zinc-400">
        Registrierte Teilnehmer:innen und offene Einladungen. Entfernen heißt: aus dem Kurs
        nehmen — nicht das Konto löschen.
      </p>

      <div className="mb-6 max-w-xl">
        <label
          htmlFor="members-course-select"
          className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
        >
          Kurs
        </label>
        <select
          id="members-course-select"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className={selectClass}
        >
          <option value="">— Kurs wählen —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.semester ? ` (${c.semester})` : ""}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-[#666666] dark:text-zinc-400">Lade Mitglieder…</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      ) : !selectedCourseId ? (
        <p className="text-sm text-[#666666] dark:text-zinc-400">Bitte einen Kurs auswählen.</p>
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
              Noch keine Schüler:innen — lade jemanden über „Schüler:in zu Kurs einladen“ ein.
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
