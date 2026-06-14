import { GoogleGenerativeAI } from "@google/generative-ai";

import type { GeneratedQuizPayload, QuizSettings } from "@/lib/server/quiz-types";
import { difficultyLabelDe } from "@/lib/quiz-labels";
import {
  isGeminiModelUnavailableError,
  isGeminiQuotaError,
  parseGeminiRetryDelayMs,
  resolveGeminiModelCandidates,
  sleep,
  toUserFacingGeminiError,
} from "@/lib/server/quiz-gemini";
import { validateGeneratedQuizPayload } from "@/lib/server/quiz-validation";

const MAX_RETRIES_PER_MODEL = 3;

function getGeminiClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY fehlt in .env.local");
  }
  return new GoogleGenerativeAI(key);
}

function buildPrompt(settings: QuizSettings): string {
  return `Du bist ein akademischer Prüfungsautor für Vorlesungsinhalte.
Lies das angehängte Vorlesungs-PDF und erstelle ein Multiple-Choice-Quiz auf Deutsch.

Anforderungen:
- Genau ${settings.question_count} Fragen
- Pro Frage genau ${settings.choice_count} Antwortmöglichkeiten
- Schwierigkeit: ${difficultyLabelDe(settings.difficulty)}
- Jede Frage hat genau EINE richtige Antwort (is_correct: true)
- Fragen prüfen Verständnis des Vorlesungsstoffs, nicht Trivia außerhalb des PDFs
- Antworten sind plausibel; falsche Antworten sind lehrreich und nicht absurd

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
    parsed = JSON.parse(text);
  } catch {
    throw new Error("KI-Antwort war kein gültiges JSON.");
  }

  if (!validateGeneratedQuizPayload(parsed, settings)) {
    throw new Error(
      "KI-Antwort entsprach nicht dem erwarteten Quiz-Format (Fragen/Antworten/richtige Lösung).",
    );
  }

  return parsed;
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

      if (isGeminiQuotaError(msg) && attempt < MAX_RETRIES_PER_MODEL - 1) {
        const delay = parseGeminiRetryDelayMs(msg) ?? (attempt + 1) * 8_000;
        await sleep(Math.min(delay + 1_000, 90_000));
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
