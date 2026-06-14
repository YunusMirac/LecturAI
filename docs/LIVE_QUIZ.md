# Live-Quiz (Kahoot-Modus)

Synchrones Quiz mit Zugangscode — Schüler:innen treten per Code bei, warten in der Lobby, beantworten alle gleichzeitig die Fragen und sehen nach jeder Frage Ergebnisse (Diagramm + Top 3).

## Migration

`009_live_quiz.sql` im Supabase SQL Editor ausführen (nach 008).

## Ablauf Lehrkraft

1. Quiz erstellen, bearbeiten, **Veröffentlichen**
2. **Live-Quiz (Kahoot-Modus)** öffnen
3. **Für Schüler öffnen** → es wird **jedes Mal ein neuer** Zugangscode erzeugt (z. B. `K7M3NP`; nach Schließen und erneutem Öffnen ein anderer Code)
4. Schüler:innen wählen den Kurs → Quiz → geben den Code ein → erscheinen in der Warteliste (E-Mail)
5. **Quiz starten** → alle sehen Frage 1 gleichzeitig (**fest 30 s** Timer, keine Einstellung)
6. Nach **30 s** oder wenn **alle geantwortet** haben → **Ergebnisbildschirm**:
   - Richtige Antwort markiert
   - Balkendiagramm: Anzahl pro Antwortoption
   - Podium: Top 3 nach **Gesamtpunkten**
   - **Kurze Anzeige (~5 s)**, wenn alle früh fertig waren
   - **Längere Anzeige (~8 s)**, wenn die Zeit abgelaufen ist (fehlende Antworten sichtbar als 0)
7. Automatisch nächste Frage — bis zur **End-Rangliste**
8. **Schließen** oder **Neue Runde** (setzt Teilnehmer zurück)

## Ablauf Schüler:in

1. Dashboard → **Kurs öffnen**
2. Quiz erscheint **nur**, wenn der Lehrer es unter Live-Quiz **für Schüler geöffnet** hat
3. Schließt der Lehrer das Quiz → verschwindet es aus der Schülerliste
4. Quiz auswählen → **Zugangscode eingeben** (nur für dieses Quiz gültig)
5. Nach korrektem Code → Warteliste bis Lehrer startet
6. Fragen beantworten, Ergebnisbildschirm nach jeder Frage
7. Am Ende: finale Rangliste

## Lehrer-Dashboard (UX)

- **Dashboard:** Kurs-Tabelle (Name, Semester, Öffnen · Bearbeiten) statt Karten-Grid
- **Kursseite:** Tabs **Quizze** | **Schüler & Einladungen**
- **Kurs bearbeiten:** `/dashboard/courses/[courseId]/edit` (Name, Semester, Löschen)

## Technik

- Synchronisation per **Polling** (~1,5 s) und serverseitiger Statusmaschine (`lobby` → `question` → `reveal` → … → `finished`)
- Feste Konstanten in `lib/quiz-live-constants.ts`: `QUESTION_SECONDS = 30`, `REVEAL_SECONDS_FAST = 5`, `REVEAL_SECONDS_SLOW = 8`
- Reveal-API liefert `top_three`, `choice_stats`, `all_answered_current`, `reveal_seconds_remaining`
- Tabellen: `quiz_live_participants`, `quiz_live_answers` + Live-Felder auf `quizzes`
- API: `/api/quizzes/[id]/join`, `/api/quizzes/[id]/live`, `/api/quizzes/[id]/live/play`

## Punkte

- Falsch: 0 Punkte
- Richtig: 500–1000 Punkte (je schneller, desto mehr)
