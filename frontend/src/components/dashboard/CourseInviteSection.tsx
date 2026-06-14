"use client";

import { useState } from "react";

import { postInvitation } from "@/lib/api";

import { inputClass } from "@/lib/ui/form-classes";

type CourseInviteSectionProps = {
  courseId: string;
  onInvited?: () => void;
};

export function CourseInviteSection({ courseId, onInvited }: CourseInviteSectionProps) {
  const [studentEmail, setStudentEmail] = useState("");
  const [studentMsg, setStudentMsg] = useState<string | null>(null);
  const [studentErr, setStudentErr] = useState<string | null>(null);
  const [studentLinkHint, setStudentLinkHint] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function onInviteStudent(e: React.FormEvent) {
    e.preventDefault();
    setStudentErr(null);
    setStudentMsg(null);
    setStudentLinkHint(null);
    setInviting(true);
    const r = await postInvitation({
      email: studentEmail.trim().toLowerCase(),
      role: "student",
      course_id: courseId,
    });
    setInviting(false);
    if (!r.ok) {
      setStudentErr(r.errorMessage);
      return;
    }
    if (r.addedDirectly) {
      const detail =
        typeof r.data.detail === "string"
          ? r.data.detail
          : `${studentEmail.trim().toLowerCase()} wurde dem Kurs hinzugefügt.`;
      setStudentMsg(detail);
    } else if (r.emailSent) {
      setStudentMsg(`Einladung zur Registrierung an ${studentEmail.trim().toLowerCase()} gesendet.`);
    } else {
      setStudentMsg("Einladung erstellt. E-Mail nicht konfiguriert — Link zur Registrierung:");
      setStudentLinkHint(r.registerUrl);
    }
    setStudentEmail("");
    onInvited?.();
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Schüler:in einladen</h3>
      <form onSubmit={(e) => void onInviteStudent(e)} className="max-w-xl space-y-4">
        <div>
          <label
            htmlFor="invite-student-email"
            className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
          >
            E-Mail der Schüler:in
          </label>
          <input
            id="invite-student-email"
            type="email"
            required
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className={inputClass}
            placeholder="student@schule.de"
          />
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="rounded-xl bg-[#2a9d8f] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {inviting ? "…" : "Einladung senden"}
        </button>
      </form>
      {studentErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{studentErr}</p> : null}
      {studentMsg ? (
        <div className="mt-4 rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#1a5c54] dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-200">
          <p>{studentMsg}</p>
          {studentLinkHint ? (
            <code className="mt-2 block break-all rounded-lg bg-black/5 px-2 py-2 text-xs dark:bg-white/10">
              {studentLinkHint}
            </code>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
