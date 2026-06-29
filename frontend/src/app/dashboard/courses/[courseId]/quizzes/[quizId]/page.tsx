import { notFound } from "next/navigation";

import { assertQuizInCourse } from "@/lib/server/page-access";

import QuizEditorPageClient from "./QuizEditorPageClient";

type PageProps = { params: Promise<{ courseId: string; quizId: string }> };

export default async function QuizEditorPage({ params }: PageProps) {
  const { courseId, quizId } = await params;
  const access = await assertQuizInCourse(quizId, courseId, { requireManage: true });
  if (!access) notFound();
  return <QuizEditorPageClient />;
}
