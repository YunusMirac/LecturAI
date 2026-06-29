import { GoogleGenerativeAI } from "@google/generative-ai";

import type { GeneratedQuizPayload, QuizSettings } from "@/lib/server/quiz-types";
import { totalDifficultyCounts } from "@/lib/server/quiz-types";
import { difficultyLabelDe } from "@/lib/quiz-labels";
import {
  isGeminiModelUnavailableError,
  isGeminiQuotaError,
  parseGeminiRetryDelayMs,
  resolveGeminiModelCandidates,
  sleep,
  toUserFacingGeminiError,
} from "@/lib/server/quiz-gemini";
import {
  describeGeneratedQuizPayloadErrors,
  normalizeGeneratedQuizPayload,
  validateGeneratedQuizPayload,
} from "@/lib/server/quiz-validation";

const MAX_RETRIES_PER_MODEL = 3;
const VALIDATION_RETRY_DELAY_MS = 2_000;

function isValidationErrorMessage(message: string): boolean {
  return (
    message.startsWith("KI-Antwort entsprach nicht") ||
    message.startsWith("KI-Antwort war kein gültiges JSON")
  );
}

export function parseGeminiJsonText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate);
}

function getGeminiClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY fehlt in .env.local");
  }
  return new GoogleGenerativeAI(key);
}

const STANDALONE_RULE =
  "WICHTIG: Jede Frage muss eigenständig und allgemeingültig formuliert sein - " +
  "KEINE Verweise auf Dokument, Text, Folie, Quelle oder Vorlesung " +
  '(z.B. "Laut dem Text...", "Im Dokument heißt es...", "In der Vorlesung...").';
function buildPrompt(settings: QuizSettings): string {
  if (settings.pool_counts) {
    const { easy, medium, hard } = settings.pool_counts;
    const total = totalDifficultyCounts(settings.pool_counts);
    return `Du bist ein akademischer Prüfungsautor.
Analysiere den bereitgestellten Inhalt und erstelle einen Multiple-Choice-Fragenpool auf Deutsch.

Anforderungen:
- Genau ${easy} leichte Fragen (difficulty: "easy")
- Genau ${medium} mittlere Fragen (difficulty: "medium")
- Genau ${hard} schwere Fragen (difficulty: "hard")
- Insgesamt ${total} Fragen
- Pro Frage genau ${settings.choice_count} Antwortmöglichkeiten
- Jede Frage hat genau EINE richtige Antwort (is_correct: true)
- Fragen prüfen das inhaltliche Verständnis des Themas
- Antworten sind plausibel; falsche Antworten sind lehrreich und nicht absurd
- Schwierigkeit muss zur Frage passen (easy = Grundlagen, medium = Anwendung, hard = Transfer/Analyse)
- ${STANDALONE_RULE}
- WICHTIG: JSON-Feldnamen exakt wie im Beispiel (Englisch): "difficulty" nur "easy"|"medium"|"hard", "is_correct" als boolean true/false

Antworte NUR als JSON in diesem Format:
{
  "questions": [
    {
      "prompt": "Fragetext",
      "difficulty": "easy",
      "choices": [
        { "text": "Antwort A", "is_correct": false },
        { "text": "Antwort B", "is_correct": true }
      ]
    }
  ]
}`;
  }

  return `Du bist ein akademischer Prüfungsautor.
Analysiere den bereitgestellten Inhalt und erstelle ein Multiple-Choice-Quiz auf Deutsch.

Anforderungen:
- Genau ${settings.question_count} Fragen
- Pro Frage genau ${settings.choice_count} Antwortmöglichkeiten
- Schwierigkeit: ${difficultyLabelDe(settings.difficulty ?? "medium")}
- Jede Frage hat genau EINE richtige Antwort (is_correct: true)
- Fragen prüfen das inhaltliche Verständnis des Themas
- Antworten sind plausibel; falsche Antworten sind lehrreich und nicht absurd
- ${STANDALONE_RULE}

Antworte NUR als JSON in diesem Format:
{
  "questions": [
    {
      "prompt": "Fragetext",
      "choices": [
        { "text": "Antwort A", "is_correct": false },
        { "text": "Antwort B", "is_correct": true }
      ]
    }
  ]
}`;
}

export { buildPrompt };

async function callGeminiOnce(
  genAI: GoogleGenerativeAI,
  modelId: string,
  pdfBuffer: Buffer,
  settings: QuizSettings,
): Promise<GeneratedQuizPayload> {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const base64 = pdfBuffer.toString("base64");
  const result = await model.generateContent([
    { text: buildPrompt(settings) },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
  ]);

  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = parseGeminiJsonText(text);
  } catch {
    throw new Error("KI-Antwort war kein gültiges JSON.");
  }

  const normalized = normalizeGeneratedQuizPayload(parsed, settings);
  const candidate = normalized ?? parsed;

  if (!validateGeneratedQuizPayload(candidate, settings)) {
    const details = describeGeneratedQuizPayloadErrors(parsed, settings);
    const hint = details.length > 0 ? ` ${details.slice(0, 3).join(" ")}` : "";
    throw new Error(
      `KI-Antwort entsprach nicht dem erwarteten Quiz-Format (Fragen/Antworten/richtige Lösung).${hint}`,
    );
  }

  return normalized ?? (candidate as GeneratedQuizPayload);
}

async function callGeminiWithRetry(
  genAI: GoogleGenerativeAI,
  modelId: string,
  pdfBuffer: Buffer,
  settings: QuizSettings,
): Promise<GeneratedQuizPayload> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt++) {
    try {
      return await callGeminiOnce(genAI, modelId, pdfBuffer, settings);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);

      if (isGeminiModelUnavailableError(msg)) throw err;

      if (
        (isGeminiQuotaError(msg) || isValidationErrorMessage(msg)) &&
        attempt < MAX_RETRIES_PER_MODEL - 1
      ) {
        const delay = isGeminiQuotaError(msg)
          ? (parseGeminiRetryDelayMs(msg) ?? (attempt + 1) * 8_000)
          : VALIDATION_RETRY_DELAY_MS * (attempt + 1);
        await sleep(Math.min(delay + (isGeminiQuotaError(msg) ? 1_000 : 0), 90_000));
        continue;
      }

      throw err;
    }
  }

  throw lastError ?? new Error("Gemini-Aufruf fehlgeschlagen.");
}

export async function generateQuizFromPdf(
  pdfBuffer: Buffer,
  settings: QuizSettings,
): Promise<GeneratedQuizPayload> {
  const genAI = getGeminiClient();
  const candidates = resolveGeminiModelCandidates();
  let lastError: unknown;

  for (const modelId of candidates) {
    try {
      return await callGeminiWithRetry(genAI, modelId, pdfBuffer, settings);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (isGeminiModelUnavailableError(msg)) continue;
      throw err;
    }
  }

  throw lastError ?? new Error("Kein Gemini-Modell verfügbar.");
}

export async function runQuizGenerationJob(
  admin: import("@supabase/supabase-js").SupabaseClient,
  quizId: string,
  pdfPath: string,
  settings: QuizSettings,
): Promise<void> {
  const { insertGeneratedQuestions } = await import("@/lib/server/quiz-db");

  try {
    const { data: fileData, error: downloadError } = await admin.storage
      .from("course-materials")
      .download(pdfPath);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? "PDF konnte nicht geladen werden.");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const payload = await generateQuizFromPdf(buffer, settings);

    await admin.from("quiz_questions").delete().eq("quiz_id", quizId);
    await insertGeneratedQuestions(admin, quizId, payload);

    const { error: updateError } = await admin
      .from("quizzes")
      .update({ status: "draft", generation_error: null })
      .eq("id", quizId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } catch (err) {
    const message = toUserFacingGeminiError(err);
    await admin
      .from("quizzes")
      .update({ status: "failed", generation_error: message })
      .eq("id", quizId);
  }
}
