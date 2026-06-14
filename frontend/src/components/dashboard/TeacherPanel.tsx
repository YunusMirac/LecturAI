"use client";

import { useState } from "react";

import { createCourse } from "@/lib/api";

import { inputClass } from "@/lib/ui/form-classes";

type TeacherPanelProps = {
  onCoursesChanged: () => void;
};

export function TeacherPanel({ onCoursesChanged }: TeacherPanelProps) {
  const [courseName, setCourseName] = useState("");
  const [courseSemester, setCourseSemester] = useState("");
  const [courseMsg, setCourseMsg] = useState<string | null>(null);
  const [courseErr, setCourseErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function onCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setCourseErr(null);
    setCourseMsg(null);
    setCreating(true);
    const r = await createCourse({
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

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-[#333333] dark:text-zinc-100">
        Lehrkraft
      </h2>

      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Neuen Kurs anlegen</h3>
        <form onSubmit={(e) => void onCreateCourse(e)} className="max-w-xl space-y-4">
          <div>
            <label
              htmlFor="new-course-name"
              className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
            >
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
            <label
              htmlFor="new-course-semester"
              className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
            >
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
    </section>
  );
}
