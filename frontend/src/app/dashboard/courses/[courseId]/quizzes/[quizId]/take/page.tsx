import { notFound } from "next/navigation";

import { assertQuizInCourse } from "@/lib/server/page-access";

import ExamTakePageClient from "./ExamTakePageClient";

type PageProps = { params: Promise<{ courseId: string; quizId: string }> };

export default async function ExamTakePage({ params }: PageProps) {
  const { courseId, quizId } = await params;
  const access = await assertQuizInCourse(quizId, courseId, { expectedQuizType: "exam" });
  if (!access) notFound();
  return <ExamTakePageClient />;
}
