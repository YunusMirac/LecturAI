"use client";

import { useEffect, useState } from "react";

import { deleteCourse, updateCourse, type Course } from "@/lib/api/coursesApi";

const inputClass =
  "w-full rounded-xl border border-white/50 bg-white/50 px-4 py-3 text-sm text-[#333333] outline-none transition placeholder:text-[#999999] focus:border-[#2a9d8f] dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const selectClass = inputClass;

type CourseManagePanelProps = {
  courses: Course[];
  onCoursesChanged: () => void;
};

export function CourseManagePanel({ courses, onCoursesChanged }: CourseManagePanelProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [editName, setEditName] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  useEffect(() => {
    if (courses.length === 1 && !selectedCourseId) {
      queueMicrotask(() => setSelectedCourseId(courses[0]!.id));
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse) {
      queueMicrotask(() => {
        setEditName("");
        setEditSemester("");
      });
      return;
    }
    queueMicrotask(() => {
      setEditName(selectedCourse.name);
      setEditSemester(selectedCourse.semester ?? "");
      setSaveMsg(null);
      setSaveErr(null);
      setDeleteMsg(null);
      setDeleteErr(null);
    });
  }, [selectedCourse]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourseId) return;
    setSaveErr(null);
    setSaveMsg(null);
    setSaving(true);
    const r = await updateCourse(selectedCourseId, {
      name: editName,
      semester: editSemester.trim() || null,
    });
    setSaving(false);
    if (!r.ok) {
      setSaveErr(r.message ?? "Speichern fehlgeschlagen.");
      return;
    }
    setSaveMsg(`Kurs „${r.course.name}“ gespeichert.`);
    onCoursesChanged();
  }

  async function onDelete() {
    if (!selectedCourse) return;
    const label = selectedCourse.semester
      ? `${selectedCourse.name} (${selectedCourse.semester})`
      : selectedCourse.name;
    const confirmed = window.confirm(
      `Kurs „${label}“ wirklich löschen?\n\nSchüler:innen behalten ihre Login-Konten; nur die Kurszuordnung entfällt.`,
    );
    if (!confirmed) return;

    setDeleteErr(null);
    setDeleteMsg(null);
    setDeleting(true);
    const r = await deleteCourse(selectedCourse.id);
    setDeleting(false);
    if (!r.ok) {
      setDeleteErr(r.message ?? "Löschen fehlgeschlagen.");
      return;
    }
    setDeleteMsg(r.detail);
    setSelectedCourseId("");
    onCoursesChanged();
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      <h3 className="mb-4 text-base font-semibold text-[#2a9d8f]">Kurs bearbeiten oder löschen</h3>
      <p className="mb-4 text-sm text-[#666666] dark:text-zinc-400">
        Name und Semester anpassen oder einen Kurs dauerhaft entfernen.
      </p>

      <div className="mb-6 max-w-xl">
        <label
          htmlFor="manage-course-select"
          className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
        >
          Kurs
        </label>
        <select
          id="manage-course-select"
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

      {selectedCourseId ? (
        <>
          <form onSubmit={(e) => void onSave(e)} className="max-w-xl space-y-4">
            <div>
              <label
                htmlFor="edit-course-name"
                className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
              >
                Kursname
              </label>
              <input
                id="edit-course-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="edit-course-semester"
                className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
              >
                Semester (optional)
              </label>
              <input
                id="edit-course-semester"
                value={editSemester}
                onChange={(e) => setEditSemester(e.target.value)}
                className={inputClass}
                placeholder="z. B. WS 2026/27"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#2a9d8f] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Speichert…" : "Änderungen speichern"}
            </button>
          </form>
          {saveErr ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{saveErr}</p> : null}
          {saveMsg ? (
            <p className="mt-3 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">{saveMsg}</p>
          ) : null}

          <div className="mt-8 border-t border-white/20 pt-6 dark:border-white/10">
            <p className="mb-3 text-sm text-[#666666] dark:text-zinc-400">
              Beim Löschen werden Einladungen und Kursmitgliedschaften entfernt. Login-Konten der
              Schüler:innen bleiben erhalten.
            </p>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void onDelete()}
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-3 text-sm font-bold text-red-700 transition hover:bg-red-500/20 disabled:opacity-50 dark:text-red-300"
            >
              {deleting ? "Löscht…" : "Kurs löschen"}
            </button>
            {deleteErr ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-300">{deleteErr}</p>
            ) : null}
            {deleteMsg ? (
              <p className="mt-3 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">{deleteMsg}</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-[#666666] dark:text-zinc-400">Bitte einen Kurs auswählen.</p>
      )}
    </div>
  );
}
