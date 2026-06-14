# LecturAI — Architekturüberblick

Ziel: **Next.js + Supabase** — eine Plattform für Auth, Datenbank und Regeln.

## Stack

| Bereich | Technik | Rolle |
|---------|---------|--------|
| `frontend/` | Next.js 16, React 19 | UI, Supabase-Client, Server-API-Routes |
| **Supabase** | Auth + PostgreSQL + RLS | Nutzer, Profile, Kurse, Einladungen |

**Kein Django mehr** im Betrieb.

## Datenmodell

- **`auth.users`** — Supabase Auth (Login, Passwort)
- **`profiles`** — `id` = `auth.users.id`, Rolle (`admin` / `teacher` / `student`)
- **`invitations`** — Whitelist-Registrierung mit Token
- **`courses`**, **`course_members`** — Kurse und Schüler-Zuordnung

## API-Schichten

| Schicht | Wo | Was |
|---------|-----|-----|
| Direkt + RLS | Browser → Supabase | Login, Kurse lesen/anlegen, Admin-Nutzerliste |
| Server Routes | `frontend/src/app/api/` | Registrierung mit Einladung, Einladung erstellen + E-Mail |

## Frontend (`src/`)

- **`app/`** — Seiten (`/`, `/login`, `/register`, `/dashboard`)
- **`lib/supabase/`** — Browser-, Server- und Admin-Client
- **`lib/api/`** — Fassade für Auth, Kurse, Einladungen
- **`components/`** — UI inkl. `AdminPanel`, `TeacherPanel`

## Setup

Siehe **`docs/SUPABASE_SETUP.md`** (Dashboard, SQL, `.env.local`, erster Admin).

Weitere Details: **`docs/PROJEKTSTRUKTUR.md`**.
