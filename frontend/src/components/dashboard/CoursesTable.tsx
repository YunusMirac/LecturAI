"use client";

import Link from "next/link";

import type { Course } from "@/lib/api";

type CoursesTableProps = {
  courses: Course[];
};

export function CoursesTable({ courses }: CoursesTableProps) {
  if (courses.length === 0) return null;

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/30 bg-white/20 text-xs uppercase tracking-wide text-[#777777] dark:border-white/10 dark:bg-zinc-900/30 dark:text-zinc-500">
              <th className="px-5 py-3 font-semibold">Kursname</th>
              <th className="px-5 py-3 font-semibold">Semester</th>
              <th className="px-5 py-3 font-semibold">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr
                key={course.id}
                className="border-b border-white/15 last:border-0 dark:border-white/5"
              >
                <td className="px-5 py-4 font-medium text-[#333333] dark:text-zinc-100">
                  {course.name}
                </td>
                <td className="px-5 py-4 text-[#666666] dark:text-zinc-400">
                  {course.semester ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="font-semibold text-[#2a9d8f] hover:underline"
                    >
                      Öffnen
                    </Link>
                    <span className="text-[#cccccc] dark:text-zinc-600" aria-hidden>
                      ·
                    </span>
                    <Link
                      href={`/dashboard/courses/${course.id}/edit`}
                      className="font-semibold text-[#666666] hover:text-[#2a9d8f] hover:underline dark:text-zinc-400"
                    >
                      Bearbeiten
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
