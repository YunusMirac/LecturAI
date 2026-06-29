# Refactoring-Inventar (Phase 0)

Stand: nach 445 Vitest-Tests, ~180 TS/TSX-Dateien, ~21k LOC in `frontend/src`.

## Größte Dateien (Extraktions-Kandidaten)

| Zeilen | Datei | Aktion geplant |
|--------|-------|----------------|
| 595 | `QuizEditorPageClient.tsx` | Phase 3: Komponenten extrahieren |
| 505 | `quiz-validation.ts` | Phase 4: parse/normalize/rules split |
| 497 | `quiz-exam.ts` | Phase 4: prüfen, ggf. Teilmodule |
| 437 | `app/page.tsx` | Phase 3: Landing-Sections |
| 408 | `quiz-live.ts` | Beobachten |
| 347 | `authApi.ts` | Phase 1: apiFetch |
| 325 | `quizzesApi.ts` | Phase 1: apiFetch + domain types |
| 310 | `ExamManagePageClient.tsx` | Phase 3: Form/Panels |
| 280 | `QuizNewPageClient.tsx` | Phase 3: Pool vs Live |

## Typ-Duplikate

- `QuizDifficulty`, `QuizType`, `QuizStatus` in `lib/api/quizzesApi.ts` und `lib/server/quiz-types.ts`
- `DifficultyCounts` nur serverseitig, Client nutzt inline Settings

## Auth / Zugriff (5 Module)

- `require-course-access.ts`, `require-managed-course.ts`, `require-managed-quiz.ts`
- `require-quiz-course-access.ts`, `page-access.ts`
- Duplikat: Kurs-Mitgliedschaft-Lookup in `require-course-access` und `page-access`

## Client-Seiten ohne PageUnavailable

- `ExamManagePageClient`, `ExamResultsPageClient`, `ExamResultDetailPageClient`
- `QuizJoinPageClient`, `ExamTakePageClient`, `QuizPlayPageClient`
- `QuizLiveHostPageClient`, `QuizNewPageClient`

## Lösch-Kandidaten (Phase 5 — Freigabe erforderlich)

| Kandidat | Begründung | Risiko |
|----------|------------|--------|
| Legacy CSS `--lectur-*` in `globals.css` | Keine Referenz in TSX/CSS gefunden | niedrig |
| `lib/auth.ts` vs `authApi.ts` | Prüfen ob zusammenlegbar (6 Importe auf auth) | mittel |
| Unbenutzte Re-Exports in `lib/api/index.ts` | Manuell prüfen per Grep | niedrig |

## Veraltete Docs

- `docs/AUDIT.md` — Testanzahl aktualisiert (446)
- `frontend/README.md` — ggf. veraltet

## Baseline-Commands

```bash
cd frontend && npm run test && npm run build && npm run lint
```
