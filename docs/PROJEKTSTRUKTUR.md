# LecturAI — Projektstruktur (Einstieg)

Diese Übersicht richtet sich an **neue Leser:innen**: Wo liegt was, und welcher Ablauf gehört wozu?

---

## Verzeichnisbaum (grob)

```text
LecturAI/
├── backend/                 # Django-Projekt
│   ├── backend/             # Projektsettings: settings.py, urls.py (nur /admin + /api/)
│   ├── api/                 # Lern-Domain (Kurse, Quiz-Models, permissions)
│   ├── users/               # Auth & Onboarding (JWT, Register, Einladungen, create_admin)
│   ├── manage.py
│   └── docs/                # optional; Supabase-Hinweise ggf. im Repo ergänzen
├── frontend/                # Next.js (App Router)
│   └── src/
│       ├── app/             # Seiten & Routen
│       ├── components/      # Wiederverwendbare UI
│       └── lib/             # API-Clients, Auth-Helfer (sessionStorage)
└── docs/
    ├── ARCHITECTURE.md      # Architekturprinzipien
    └── PROJEKTSTRUKTUR.md   # diese Datei
```

---

## Backend: Zwei Apps

| App | Inhalt |
|-----|--------|
| **`api`** | Unmanaged Models für **Kurse, Quiz, …** (Tabellen kommen aus Supabase). **`permissions.py`**: `IsAdmin`, `IsTeacher`, … anhand von **`profiles.role`**. **`views.py`**: Kursliste/-anlage. **`urls.py`**: unter `/api/` nur noch `courses/` + Include von `users.urls`. |
| **`users`** | **Identität & Whitelist-Onboarding.** Models laut Vorgabe in `users/models.py` (inkl. Auth-Tabellen-Spiegel, `Profiles`, `Invitation`). **`views.py`**: Login (JWT), Register, Einladung erstellen. **`serializers.py`**: Payloads & Validierung. **`invitations.py`**: reine Domänenlogik Einladungen (Token, DB-Zeilen) — **ein Modul**, kein `services/`-Unterordner mehr. **`management/commands/create_admin.py`**: erster Admin. |

**Wichtige URLs (alle unter `/api/`):**

- `POST /api/auth/token/` — Login (E-Mail, Passwort) → JWT + `email`/`role` fürs Frontend  
- `POST /api/auth/token/refresh/` — Refresh  
- `POST /api/auth/register/` — Registrierung nur mit `invite_token` + E-Mail + Passwort  
- `POST /api/invitations/` — Einladung (Admin → Lehrer, Lehrer → Schüler mit `course_id`)  
- `GET /api/courses/` — Kurse (JWT)  
- `POST /api/courses/` — Kurs anlegen (nur Lehrkraft)  
- `GET /api/admin/users/` — alle `profiles` (nur Admin)

**Nicht mehr vorhanden:** E-Mail-Verifizierungslink (`/api/auth/verify-email/...`) — Registrierung läuft ausschließlich über **Einladungstoken**; Nutzer werden aktiv angelegt.

---

## Frontend

| Pfad | Rolle |
|------|--------|
| `src/app/(auth)/` | Login, Register (Route-Gruppe, URLs `/login`, `/register`) |
| `src/app/dashboard/` | Kurse + rollenbasierte Panels (Admin: Lehrer einladen, Nutzerliste; Lehrkraft: Kurs anlegen, Schüler:in einladen) |
| `src/components/dashboard/` | `AdminPanel`, `TeacherPanel` |
| `src/lib/api/` | `authApi`, `adminUsersApi`, `coursesApi`, `invitationsApi`, `config`, `guards` |
| `src/lib/auth.ts` | Tokens + Nutzeranzeige in `sessionStorage`, Logout-Event |

---

## Typischer Flow

1. **Admin** (per `create_admin` in DB) lädt **Lehrer** per `POST /api/invitations/` ein.  
2. **Lehrer** registriert sich mit Link (`invite_token`) → `POST /api/auth/register/`.  
3. **Lehrer** lädt **Schüler:innen** mit `course_id` ein → gleiche Register-Route.  
4. **Login** → JWT; **Rollen** für UI/API aus `profiles` (nicht aus Django-Groups).

---

## Wo nicht suchen

- **Kein** `users/services/` mehr — Einladungslogik liegt in **`users/invitations.py`**.  
- **Kein** `users/tokens.py` — kein Legacy-E-Mail-Bestätigungs-Flow.  
- **`api`** enthält **keine** Register-/Login-Views — die liegen in **`users`**.

Bei Schema-Änderungen in Supabase: Tabellen dort pflegen, dann **`api/models.py`** und **`users/models.py`** manuell synchron halten (`managed = False`).
