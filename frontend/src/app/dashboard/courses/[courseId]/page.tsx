import { notFound } from "next/navigation";

import { assertCourseMember } from "@/lib/server/page-access";

import CoursePageClient from "./CoursePageClient";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = await params;
  const access = await assertCourseMember(courseId);
  if (!access) notFound();
  return <CoursePageClient />;
}
