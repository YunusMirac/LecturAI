import { notFound } from "next/navigation";

import { assertQuizInCourse } from "@/lib/server/page-access";

import QuizJoinPageClient from "./QuizJoinPageClient";

type PageProps = { params: Promise<{ courseId: string; quizId: string }> };

export default async function QuizJoinPage({ params }: PageProps) {
  const { courseId, quizId } = await params;
  const access = await assertQuizInCourse(quizId, courseId);
  if (!access) notFound();
  return <QuizJoinPageClient />;
}
