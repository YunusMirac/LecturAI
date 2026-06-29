"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardAsyncPage } from "@/components/dashboard/DashboardAsyncPage";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { deleteCourse, updateCourse } from "@/lib/api/coursesApi";
import { fetchCourseDetail } from "@/lib/api/quizzesApi";
import { useAsyncResource } from "@/lib/hooks/useAsyncResource";
import { useRouteParams } from "@/lib/hooks/useRouteParams";
import { inputClass } from "@/lib/ui/form-classes";

export default function CourseEditPageClient() {
  const { courseId } = useRouteParams();
  const router = useRouter();

  const [editName, setEditName] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchCourseDetail(courseId);
    if (!result.ok) {
      return { ok: false as const, message: result.message, notFound: result.notFound };
    }
    if (!result.course.can_manage) {
      return { ok: false as const, message: "", notFound: true };
    }
    setEditName(result.course.name);
    setEditSemester(result.course.semester ?? "");
    return { ok: true as const, data: result.course };
  }, [courseId]);

  const { data: course, loading, error, notFound, setData } = useAsyncResource(load);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveErr(null);
    setSaveMsg(null);
    setSaving(true);
    const r = await updateCourse(courseId, {
      name: editName,
      semester: editSemester.trim() || null,
    });
    setSaving(false);
    if (!r.ok) {
      setSaveErr(r.message ?? "Speichern fehlgeschlagen.");
      return;
    }
    setSaveMsg(`Kurs „${r.course.name}“ gespeichert.`);
    setData((prev) =>
      prev ? { ...prev, name: r.course.name, semester: r.course.semester } : prev,
    );
  }

  async function onDelete() {
    if (!course) return;
    const label = course.semester ? `${course.name} (${course.semester})` : course.name;
    const confirmed = window.confirm(
      `Kurs „${label}“ wirklich löschen?\n\nSchüler:innen behalten ihre Login-Konten; nur die Kurszuordnung entfällt.`,
    );
    if (!confirmed) return;

    setDeleteErr(null);
    setDeleteMsg(null);
    setDeleting(true);
    const r = await deleteCourse(courseId);
    setDeleting(false);
    if (!r.ok) {
      setDeleteErr(r.message ?? "Löschen fehlgeschlagen.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
        <DashboardBackLink href={`/dashboard/courses/${courseId}`} label="← Zurück zum Kurs" />

        <h1 className="mb-8 text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
          Kurs bearbeiten
        </h1>

        <DashboardAsyncPage
          loading={loading}
          loadingLabel="Lade Kurs…"
          notFound={notFound}
          error={error}
          hasData={Boolean(course)}
        >
          {course ? (
            <>
              <div className="glass-panel mb-8 rounded-2xl p-6 sm:p-8">
                <h2 className="mb-4 text-base font-semibold text-[#2a9d8f]">Stammdaten</h2>
                <form onSubmit={(e) => void onSave(e)} className="space-y-4">
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
                {saveErr ? (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-300">{saveErr}</p>
                ) : null}
                {saveMsg ? (
                  <p className="mt-3 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">{saveMsg}</p>
                ) : null}
              </div>

              <div className="glass-panel rounded-2xl border border-red-300/30 p-6 sm:p-8 dark:border-red-900/40">
                <h2 className="mb-2 text-base font-semibold text-red-700 dark:text-red-300">
                  Gefahrenzone
                </h2>
                <p className="mb-4 text-sm text-[#666666] dark:text-zinc-400">
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
          ) : null}
        </DashboardAsyncPage>
      </div>
    </MarketingAuthShell>
  );
}
