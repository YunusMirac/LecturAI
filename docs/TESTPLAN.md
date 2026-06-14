# LecturAI — Testplan (Abgabe)

Automatisierte Tests: `cd frontend && npm run test`  
Manuelle Tests: unten mit echtem Supabase-Projekt.

**Voraussetzungen:** Migrationen 001–**009** im SQL Editor, `frontend/.env.local` mit allen Keys (inkl. `GEMINI_API_KEY` für Quiz-KI), Dev-Server (`npm run dev`).

---

## 1. Admin anlegen (einmalig)

1. Supabase Dashboard → User anlegen (E-Mail + Passwort, Auto Confirm)
2. SQL: `profiles` mit `role = 'admin'` für diese UUID
3. Login unter `/login` → Dashboard zeigt Admin-Panel

**Erwartung:** Rolle „Administration“, Lehrkraft einladen sichtbar.

---

## 2. Lehrkraft einladen und registrieren

1. Admin → E-Mail einer Test-Lehrkraft eingeben → „Einladung senden“
2. Link kopieren (oder E-Mail mit Resend)
3. Link im **Inkognito-Fenster** öffnen → `/register?invite_token=…`
4. Seite zeigt E-Mail + Rolle, **nur Passwort-Felder**
5. Passwort setzen → Auto-Login → Dashboard

**Erwartung:** Lehrkraft-Panel sichtbar, Kurs anlegen möglich.

---

## 3. Kurs anlegen

1. Als Lehrkraft: Kursname + optional Semester → anlegen
2. Kurs erscheint in der **Kurs-Tabelle** (Name, Semester, Aktionen)

**Erwartung:** Erfolgsmeldung, Zeile in der Tabelle mit „Öffnen“ und „Bearbeiten“.

---

## 4. Schüler:in einladen und registrieren

1. Lehrkraft → Kurs **Öffnen** → Tab **Schüler & Einladungen** → E-Mail eingeben → einladen
2. **Neue E-Mail:** Einladungslink im Inkognito → Registrierung
3. **Bereits registrierte Schüler:in:** wird **direkt dem Kurs hinzugefügt** (kein Registrierungslink), optional E-Mail „Neuer Kurs im Dashboard“
4. Passwort setzen (nur bei Erst-Registrierung) → Dashboard
5. **Lehrkraft:** In derselben Kursseite unter Mitglieder prüfen — Status „Registriert“ oder „Einladung offen“

**Erwartung:** Schüler sieht Kurs als klickbare Karte → Kursseite mit veröffentlichten Quizzen. Bereits registrierte Schüler:innen sehen neue Kurse sofort nach Einladung (nach Login). Lehrkraft verwaltet Einladungen auf der Kursseite.

---

## 5. Login / Logout

1. Abmelden → Startseite
2. Erneut `/login` → gleiche Rolle im Dashboard

**Erwartung:** Session funktioniert, `/dashboard` ohne Login → Redirect zu `/login`.

---

## 6. Fehlerfälle

| Aktion | Erwartung |
|--------|-----------|
| `/register` ohne Token | Hinweis „nur mit Einladungslink“ |
| Abgelaufener / falscher Token | Fehlermeldung auf Register-Seite |
| Falsches Login-Passwort | Fehlermeldung auf Login |
| Passwort vergessen → Link anfordern | Erfolgsmeldung (E-Mail wenn Konto existiert) |
| Reset-Link öffnen → neues Passwort | Weiterleitung zu Login, Anmeldung mit neuem Passwort |
| Schüler versucht Kurs anlegen | Nicht möglich (kein UI) |

---

## 7. Automatisierte Tests (CI)

```bash
cd frontend
npm run lint
npm run test
npm run build
```

**Erwartung:** Alle Befehle exit code 0, mindestens 280 Unit-Tests grün (davon ~90 Quiz-System, ~40 Live-Quiz).

Vollständiger System-Audit: **[AUDIT.md](AUDIT.md)**

---

## 8. Quiz aus PDF (Lehrkraft)

**Voraussetzung:** Migration 008, `GEMINI_API_KEY` in `.env.local`, kleines Test-PDF (< 5 MB).

1. Als Lehrkraft: Dashboard → Kurs in Tabelle **Öffnen** → Kursseite (Tab Quizze)
2. „Quiz aus PDF erstellen“ → PDF wählen, z. B. 10 Fragen, 4 Antworten, Schwierigkeit Mittel
3. „Quiz generieren“ → Weiterleitung zum Editor, Status „Wird erstellt…“
4. Warten bis Status „Entwurf“ — Fragen und Antworten sichtbar
5. Fragetext ändern, andere Antwort als richtig markieren, eine Frage löschen
6. „Frage manuell hinzufügen“ mit 4 Antworten
7. „Veröffentlichen“ → Status „Veröffentlicht“, Bearbeiten gesperrt

| Aktion | Erwartung |
|--------|-----------|
| PDF fehlt beim Submit | Fehlermeldung im Wizard |
| `GEMINI_API_KEY` fehlt | Quiz endet mit Status „Fehlgeschlagen“ |
| Veröffentlichen ohne Fragen | Fehlermeldung |
| Schüler öffnet Kurs | Kein „Quiz erstellen“-Button (Phase 3 für Schüler-Quiz) |

Details zur KI-Pipeline: **[QUIZ_AI.md](QUIZ_AI.md)**

---

## 9. Live-Quiz Ergebnisbildschirm

**Voraussetzung:** Migration 009, veröffentlichtes Quiz, Lehrer + mindestens ein Schüler (zweiter Browser/Inkognito).

1. Lehrkraft: Quiz → **Live-Quiz** → **Für Schüler öffnen** → Code kopieren
2. Schüler: Dashboard → **Kurs öffnen** → veröffentlichtes Quiz wählen → **Code eingeben**
3. Schüler landet in der Warteliste
3. Lehrkraft: **Quiz starten**
4. Schüler antwortet schnell; Lehrkraft und Schüler sehen nach ~5 s:
   - Richtige Antwort hervorgehoben
   - Balkendiagramm pro Antwortoption
   - Top-3-Podium (Gesamtpunkte)
   - Countdown „Nächste Frage in Xs…“
5. Zweite Frage: niemand antwortet → nach **30 s** Ergebnis mit **~8 s** Anzeige (fehlende Antworten = 0 im Diagramm)
6. Quiz durchspielen → finale Rangliste

| Aktion | Erwartung |
|--------|-----------|
| Keine Sekunden-Eingabe beim Öffnen | Immer 30 s pro Frage |
| Host- und Schüler-Ansicht in Reveal | Gleiches Diagramm + Top 3 |
| Alle antworten vor 30 s | Schneller Übergang (~5 s Reveal) |

Details: **[LIVE_QUIZ.md](LIVE_QUIZ.md)**

---

## Bekannte Grenzen (Stand Abgabe)

- E-Mail-Versand optional (Resend); sonst Link aus Dashboard kopieren. Passwort-Reset nutzt Supabase-E-Mail.
