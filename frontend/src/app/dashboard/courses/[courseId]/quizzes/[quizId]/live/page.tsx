import { notFound } from "next/navigation";

import { assertQuizInCourse } from "@/lib/server/page-access";

import QuizLiveHostPageClient from "./QuizLiveHostPageClient";

type PageProps = { params: Promise<{ courseId: string; quizId: string }> };

export default async function QuizLiveHostPage({ params }: PageProps) {
  const { courseId, quizId } = await params;
  const access = await assertQuizInCourse(quizId, courseId, {
    requireManage: true,
    expectedQuizType: "live",
  });
  if (!access) notFound();
  return <QuizLiveHostPageClient />;
}
