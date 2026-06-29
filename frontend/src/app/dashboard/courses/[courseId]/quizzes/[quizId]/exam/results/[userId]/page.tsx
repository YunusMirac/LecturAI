import { notFound } from "next/navigation";

import { assertQuizInCourse } from "@/lib/server/page-access";

import ExamResultDetailPageClient from "./ExamResultDetailPageClient";

type PageProps = { params: Promise<{ courseId: string; quizId: string; userId: string }> };

export default async function ExamResultDetailPage({ params }: PageProps) {
  const { courseId, quizId } = await params;
  const access = await assertQuizInCourse(quizId, courseId, {
    requireManage: true,
    expectedQuizType: "exam",
  });
  if (!access) notFound();
  return <ExamResultDetailPageClient />;
}
