export {
  MAX_CHOICES,
  MAX_QUESTIONS,
  MIN_CHOICES,
  MIN_QUESTIONS,
} from "@/lib/quiz-labels";

export {
  parseExamConfig,
  parseQuizSettings,
  resolveExamDuration,
} from "@/lib/server/quiz-validation-parse";

export {
  describeGeneratedQuizPayloadErrors,
  normalizeGeneratedQuizPayload,
  normalizeQuizDifficulty,
} from "@/lib/server/quiz-validation-normalize";

export {
  buildLegacyDrawCounts,
  countQuestionsInPool,
  resolveEffectiveDrawCounts,
  validateCreateQuizSettings,
  validateExamConfig,
  validateGeneratedQuizPayload,
  validateQuestionForPublish,
  validateQuizForPublish,
} from "@/lib/server/quiz-validation-rules";
