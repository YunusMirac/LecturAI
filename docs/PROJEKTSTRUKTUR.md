# LecturAI — Projektstruktur

## Verzeichnisbaum

```text
LecturAI/
├── frontend/              # Next.js — einzige laufende App
│   └── src/
│       ├── app/           # Seiten + /api/register, /api/invitations
│       ├── components/
│       └── lib/
│           ├── supabase/  # Supabase Clients
│           └── api/       # Auth, Kurse, Einladungen
├── supabase/
│   ├── migrations/        # SQL für Dashboard
│   └── scripts/           # z. B. Admin anlegen
├── docs/
│   ├── SUPABASE_SETUP.md  # ⭐ Einstieg Setup
│   └── ARCHITECTURE.md
└── backend/               # Legacy (Django, nicht mehr betrieben)
```

## Wichtige URLs

| Route | Beschreibung |
|-------|--------------|
| `/login` | Supabase Auth Login |
| `/register?invite_token=…` | Registrierung mit Einladung |
| `/dashboard` | Kurse + Admin/Lehrer-Panels |

## Rollen-Flow

1. Admin in Supabase anlegen → `profiles.role = admin`
2. Admin lädt Lehrkraft ein → `/api/invitations`
3. Lehrkraft registriert sich → `/api/register`
4. Lehrkraft lädt Schüler:in ein (mit `course_id`)
5. Alle loggen sich mit Supabase Auth ein

Setup: **`docs/SUPABASE_SETUP.md`**
