# Quiz-KI (Gemini) — Phase 2

Lehrkräfte laden ein Vorlesungs-PDF hoch; **Google Gemini** erzeugt strukturierte Multiple-Choice-Fragen. Die Generierung läuft asynchron; danach können Fragen bearbeitet und veröffentlicht werden.

## Voraussetzungen

1. Migration **`008_quizzes.sql`** im Supabase SQL Editor ausführen (Tabellen + Storage-Bucket `course-materials`).
2. In `frontend/.env.local`:

```env
GEMINI_API_KEY=dein-api-key
# Optional (Default ohne Eintrag: gemini-2.5-flash):
# GEMINI_MODEL=gemini-2.5-flash
# QUIZ_MAX_PDF_MB=15
```

API-Key: [Google AI Studio](https://aistudio.google.com/apikey)

## Ablauf

```text
POST /api/courses/[courseId]/quizzes  (multipart: pdf + settings)
  → PDF → Supabase Storage (course-materials/{courseId}/{quizId}/source.pdf)
  → Quiz status=generating
  → after(): Gemini liest PDF (Base64) → JSON
  → quiz_questions + quiz_choices insert
  → status=draft (oder failed + generation_error)
```

Client pollt `GET /api/quizzes/[quizId]` alle ~2,5 s bis `draft` oder `failed`.

## JSON-Schema (KI-Output)

### Live-Quiz (Legacy)

```json
{
  "questions": [
    {
      "prompt": "Fragetext …",
      "choices": [
        { "text": "Antwort A", "is_correct": true },
        { "text": "Antwort B", "is_correct": false }
      ]
    }
  ]
}
```

### Klausur-Pool (exam)

Pro Frage zusätzlich `"difficulty": "easy" | "medium" | "hard"`. Die KI erzeugt z. B. 10 leichte + 10 mittlere + 20 schwere Fragen (`settings_json.pool_counts`).

Validierung in `frontend/src/lib/server/quiz-validation.ts`:

- **Live:** Anzahl Fragen ≈ `settings.question_count` (±2 Toleranz)
- **Klausur-Pool:** Pro Schwierigkeitsstufe ≈ `pool_counts.*` (±2 Toleranz), jedes Question-Objekt braucht `difficulty`
- Pro Frage exakt `settings.choice_count` Antworten
- Genau eine Antwort mit `is_correct: true`

Fragen werden in `quiz_questions.difficulty` gespeichert (Migration `011_exam_pool.sql`).

## Implementierung

| Datei | Rolle |
|-------|--------|
| `quiz-generation.ts` | Gemini-Aufruf, PDF einlesen, JSON parsen |
| `quiz-validation.ts` | Settings + Payload + Publish-Regeln |
| `quiz-db.ts` | DB-Helfer (Detail laden, Fragen speichern) |
| `require-managed-quiz.ts` | Auth + Kurs-Zugriff für Quiz-Routes |

Modell-Default: **`gemini-2.5-flash`** (über `GEMINI_MODEL` änderbar). Bei Fehlern werden automatisch `gemini-2.5-flash-lite` und `gemini-flash-latest` probiert.

> **Hinweis:** `gemini-2.0-flash` wurde im Juni 2026 abgeschaltet — Free-Tier-Quota ist dort `0`. Entferne alte `GEMINI_MODEL=gemini-2.0-flash` Einträge aus `.env.local`.

## Fehlerbehandlung

| Status | Bedeutung |
|--------|-----------|
| `generating` | KI arbeitet noch |
| `draft` | Bearbeiten + Veröffentlichen möglich |
| `failed` | `generation_error` in DB — neues Quiz anlegen |
| `published` | Live (Schüler-UI Phase 3) |

Typische Fehler: fehlender `GEMINI_API_KEY`, PDF zu groß, ungültiges KI-JSON, Gemini-Rate-Limit.

## Alternative: OpenAI

OpenAI kann PDFs nicht direkt lesen. Stattdessen: `pdf-parse` → Text extrahieren → `gpt-4o-mini` mit `response_format: json_schema`. Nicht implementiert; bei Bedarf zweite Pipeline in `quiz-generation.ts` ergänzen.

## Sicherheit

- PDF-Upload nur über authentifizierte API-Route (Service Role → Storage)
- Max. Größe + MIME `application/pdf`
- PDF-Inhalt nur serverseitig an Gemini; Key nie im Browser
