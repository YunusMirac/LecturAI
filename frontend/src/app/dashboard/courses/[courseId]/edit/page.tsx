import { notFound } from "next/navigation";

import { assertCourseManager } from "@/lib/server/page-access";

import CourseEditPageClient from "./CourseEditPageClient";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function CourseEditPage({ params }: PageProps) {
  const { courseId } = await params;
  if (!(await assertCourseManager(courseId))) notFound();
  return <CourseEditPageClient />;
}
