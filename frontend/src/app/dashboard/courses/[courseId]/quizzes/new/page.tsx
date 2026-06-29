import { notFound } from "next/navigation";

import { assertCourseManager } from "@/lib/server/page-access";

import QuizNewPageClient from "./QuizNewPageClient";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function QuizNewPage({ params }: PageProps) {
  const { courseId } = await params;
  if (!(await assertCourseManager(courseId))) notFound();
  return <QuizNewPageClient />;
}
