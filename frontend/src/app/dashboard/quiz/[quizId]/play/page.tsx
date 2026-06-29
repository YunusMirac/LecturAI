import { notFound } from "next/navigation";

import { assertQuizMember } from "@/lib/server/page-access";

import QuizPlayPageClient from "./QuizPlayPageClient";

type PageProps = { params: Promise<{ quizId: string }> };

export default async function QuizPlayPage({ params }: PageProps) {
  const { quizId } = await params;
  if (!(await assertQuizMember(quizId))) notFound();
  return <QuizPlayPageClient />;
}
