"use client";

import { useState } from "react";

import { createCourse, postInvitation, type Course } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-white/50 bg-white/50 px-4 py-3 text-sm text-[#333333] outline-none transition placeholder:text-[#999999] focus:border-[#2a9d8f] dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const selectClass = inputClass;

type TeacherPanelProps = {
  accessToken: string;
  courses: Course[];
  onCoursesChanged: () => void;
};

export function TeacherPanel({ accessToken, courses, onCoursesChanged }: TeacherPanelProps) {
  const [courseName, setCourseName] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseMsg, setCourseMsg] = useState<string | null>(null);
  const [courseErr, setCourseErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [studentEmail, setStudentEmail] = useState("");
  const [studentCourseId, setStudentCourseId] = useState("");
  const [studentMsg, setStudentMsg] = useState<string | null>(null);
  const [studentErr, setStudentErr] = useState<string | null>(null);
  const [studentTokenHint, setStudentTokenHint] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function onCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setCourseErr(null);
    setCourseMsg(null);
    setCreating(true);
    const r = await createCourse(accessToken, {
      name: courseName,
      semester: courseSemester.trim() || undefined,
    });
    setCreating(false);
    if (!r.ok) {
      setCourseErr(r.message ?? "Kurs konnte nicht angelegt werden.");
      return;
    }
    setCourseMsg(`Kurs „${r.course.name}“ angelegt.`);
    setCourseName("");
    setCourseSemester("");
    onCoursesChanged();
  }

  async function onInviteStudent(e: React.FormEvent) {
    e.preventDefault();
    setStudentErr(null);
    setStudentMsg(null);
    setStudentTokenHint(null);
    if (!studentCourseId) {
      setStudentErr("Bitte einen Kurs wählen.");
      return;
    }
    setInviting(true);
    const r = await postInvitation(accessToken, {
      email: studentEmail.trim().toLowerCase(),
      role: "student",
      course_id: studentCourseId,
    });
    setInviting(false);
    if (!r.ok) {
      setStudentErr(r.errorMessage);
      return;
    }
    const tok =
      typeof r.data.invite_token === "string" ? (r.data.invite_token as string) : null;
    setStudentMsg("Einladung erstellt. Registrierungs-Link:");
    setStudentTokenHint(tok);
    setStudentEmail("");
    onCoursesChanged();
  }

  return (
    <section className="mb-10 space-y-8">
      <h2 className="text-lg font-bold tracking-tight text-[#333333] dark:text-zinc-100">
        Lehrkraft
      </h2>

      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Neuen Kurs anlegen</h3>
        <form onSubmit={(e) => void onCreateCourse(e)} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="new-course-name" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
              Kursname
            </label>
            <input
              id="new-course-name"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className={inputClass}
              placeholder="z. B. Analysis I"
            />
          </div>
          <div>
            <label htmlFor="new-course-semester" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
              Semester (optional)
            </label>
            <input
              id="new-course-semester"
              value={courseSemester}
              onChange={(e) => setCourseSemester(e.target.value)}
              className={inputClass}
              placeholder="z. B. WS 2026/27"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-[#2a9d8f] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {creating ? "Wird angelegt…" : "Kurs speichern"}
          </button>
        </form>
        {courseErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{courseErr}</p> : null}
        {courseMsg ? (
          <p className="mt-3 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">{courseMsg}</p>
        ) : null}
      </div>

      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Schüler:in zu Kurs einladen</h3>
        {courses.length === 0 ? (
          <p className="text-sm text-[#666666] dark:text-zinc-400">
            Lege zuerst einen Kurs an, dann kannst du Schüler:innen einladen.
          </p>
        ) : (
          <form onSubmit={(e) => void onInviteStudent(e)} className="max-w-xl space-y-4">
            <div>
              <label htmlFor="invite-student-course" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                Kurs
              </label>
              <select
                id="invite-student-course"
                required
                value={studentCourseId}
                onChange={(e) => setStudentCourseId(e.target.value)}
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
            <div>
              <label htmlFor="invite-student-email" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
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
              {inviting ? "…" : "Einladung erstellen"}
            </button>
          </form>
        )}
        {studentErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{studentErr}</p> : null}
        {studentMsg ? (
          <div className="mt-4 rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#1a5c54] dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-200">
            <p>{studentMsg}</p>
            {studentTokenHint ? (
              <code className="mt-2 block break-all rounded-lg bg-black/5 px-2 py-2 text-xs dark:bg-white/10">
                ?invite_token={encodeURIComponent(studentTokenHint)}
              </code>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
