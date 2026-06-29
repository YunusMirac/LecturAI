"use client";

import { useParams } from "next/navigation";

export function useRouteParams() {
  const params = useParams();
  return {
    courseId: String(params.courseId ?? ""),
    quizId: String(params.quizId ?? ""),
    userId: String(params.userId ?? ""),
  };
}
