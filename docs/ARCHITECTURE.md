# LecturAI — Architekturüberblick

Ziel: **klare Grenzen**, wenig Magie, Supabase/PostgreSQL als Schema-Quelle, schlankes Next.js-Frontend.

## Monorepo

| Bereich        | Technik              | Rolle |
|----------------|----------------------|--------|
| `backend/`     | Django 6, DRF, JWT   | REST-API, Auth, Einladungen, Kurse (ORM-Spiegel auf Postgres) |
| `frontend/`    | Next.js (App Router) | UI, spricht nur per HTTP mit dem Backend |

## Backend-Apps

- **`api`** — Lern-Domain: unmanaged Models (`Courses`, Quiz, …), `permissions`, Kurs-API. Keine Auth-Endpunkte.
- **`users`** — Identität & Onboarding: Models in `users/models.py`, Login/Register/Einladungen in `users/views.py` + `users/serializers.py`, Einladungslogik in **`users/invitations.py`**, Management-Command `create_admin`.

**URLs:** Nur noch `path("api/", include("api.urls"))` in `backend/urls.py`. `api/urls.py` mountet `courses/` und bindet **`users.urls`** ohne Prefix ein → `/api/auth/…`, `/api/invitations/`, unverändert zu vorher.

**Datenbank:** `DATABASE_URL` ist **Pflicht** (`ImproperlyConfigured`, wenn fehlend). Produktiv: `DJANGO_SECRET_KEY` setzen.

## Frontend (`src/`)

- **`app/`** — Routen; Route-Gruppe **`(auth)`** für Login und Registrierung (`/login`, `/register`).
- **`components/`** — UI-Bausteine (`landing/`, `theme/`).
- **`lib/api/`** — Backend-Anbindung: `config`, `guards` (gemeinsame Typ-Helfer), modulare Clients (`authApi`, `coursesApi`, `invitationsApi`), Barrel `index.ts`.
- **`lib/auth.ts`** — Session-Storage-Keys und Logout-Hilfen (Client-only).

## Konventionen

- API-Pfade im Frontend immer über `API_URL` + `/api/...`.
- Fehlerantworten DRF: `detail` oder Feldlisten — Parser in den jeweiligen `*Api.ts`.
- Keine duplizierten `isRecord`-Helfer: zentral `lib/api/guards.ts`.

Weitere Details: **`docs/PROJEKTSTRUKTUR.md`** (Einstieg & Dateizuordnung).
