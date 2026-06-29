import { notFound } from "next/navigation";

import { assertQuizInCourse } from "@/lib/server/page-access";

import ExamManagePageClient from "./ExamManagePageClient";

type PageProps = { params: Promise<{ courseId: string; quizId: string }> };

export default async function ExamManagePage({ params }: PageProps) {
  const { courseId, quizId } = await params;
  const access = await assertQuizInCourse(quizId, courseId, {
    requireManage: true,
    expectedQuizType: "exam",
  });
  if (!access) notFound();
  return <ExamManagePageClient />;
}
