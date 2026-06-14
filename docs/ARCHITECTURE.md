# LecturAI — Architekturüberblick

**Next.js + Supabase** — Auth, Datenbank und Geschäftslogik in einer Plattform.

## Stack

| Bereich | Technik | Rolle |
|---------|---------|--------|
| `frontend/` | Next.js 16, React 19 | UI, Supabase Auth im Browser, Server-API-Routes |
| **Supabase** | Auth + PostgreSQL + RLS | Nutzer, Profile, Kurse, Einladungen |

## Datenmodell

| Tabelle | Inhalt |
|---------|--------|
| `auth.users` | Supabase Auth (Login, Passwort) |
| `profiles` | `id` = `auth.users.id`, Rolle (`admin` / `teacher` / `student`) |
| `invitations` | Whitelist-Registrierung mit Token |
| `courses` | Kurse (Lehrkraft = `teacher_id`) |
| `course_members` | Schüler-Zuordnung zu Kursen |
| `quizzes` | KI-/Lehrer-Quizze pro Kurs (`generating` / `draft` / `published` / `failed`) |
| `quiz_questions` | Fragen eines Quiz |
| `quiz_choices` | Antwortoptionen (genau eine `is_correct` pro Frage) |

**Storage:** Bucket `course-materials` (private) — Quell-PDFs unter `{courseId}/{quizId}/source.pdf`.

## API-Schichten

| Schicht | Wo | Was |
|---------|-----|-----|
| Supabase Auth | Browser (`supabase-js`) | Login, Logout, Session |
| Next.js API Routes | `frontend/src/app/api/` | Profil, Kurse, Registrierung, Einladungen, Admin |
| Service Role | Nur serverseitig | DB-Zugriff ohne RLS-Probleme in API-Routes |

### API-Endpunkte

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/invitations/preview` | GET | Einladung prüfen (öffentlich, für Register-Seite) |
| `/api/me` | GET | Eingeloggtes Profil |
| `/api/courses` | GET, POST | Kurse laden / anlegen |
| `/api/courses/[courseId]/members` | GET | Schüler:innen + offene Einladungen |
| `/api/register` | POST | Registrierung mit Einladungstoken |
| `/api/invitations` | POST | Einladung erstellen (+ optional E-Mail) |
| `/api/admin/users` | GET | Nutzerliste (nur Admin) |
| `/api/courses/[courseId]` | GET, PATCH, DELETE | Kursdetail / bearbeiten / löschen |
| `/api/courses/[courseId]/quizzes` | GET, POST | Quiz-Liste / PDF-Upload + KI-Start |
| `/api/quizzes/[quizId]` | GET | Quiz inkl. Fragen (Poll bei `generating`) |
| `/api/quizzes/[quizId]/publish` | POST | Validierung → `published` |
| `/api/quizzes/[quizId]/questions` | POST | Manuelle Frage |
| `/api/quizzes/[quizId]/questions/[qId]` | PATCH, DELETE | Frage bearbeiten/löschen |
| `/api/quizzes/[quizId]/questions/[qId]/choices` | POST | Antwort hinzufügen |
| `/api/quizzes/[quizId]/questions/[qId]/choices/[cId]` | PATCH, DELETE | Antwort bearbeiten/löschen |

## Frontend (`src/`)

```text
src/
├── app/              # Seiten + API-Routes
├── components/       # UI (Dashboard, Landing, Theme)
└── lib/
    ├── supabase/     # Browser-, Server- und Admin-Client
    ├── api/          # Client-Fassade (fetch → /api/*)
    └── server/       # Auth-Helfer für API-Routes
```

## Setup

Siehe **[docs/SUPABASE_SETUP.md](SUPABASE_SETUP.md)**.

Weitere Details: **[docs/PROJEKTSTRUKTUR.md](PROJEKTSTRUKTUR.md)**.
