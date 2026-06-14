# LecturAI — Projektstruktur

## Verzeichnisbaum

```text
LecturAI/
├── frontend/                  # Next.js — einzige App
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/        # /login, /register
│   │   │   ├── dashboard/     # /dashboard
│   │   │   └── api/           # Server-API-Routes (inkl. invitations/preview)
│   │   ├── components/        # UI-Komponenten
│   │   └── lib/
│   │       ├── supabase/      # Supabase Clients
│   │       ├── api/           # Client-Fassade
│   │       └── server/        # API-Helfer
│   ├── .env.example
│   └── package.json
├── supabase/
│   ├── migrations/            # SQL (001–007)
│   └── scripts/               # z. B. Admin anlegen
├── docs/
│   ├── SUPABASE_SETUP.md      # ⭐ Einstieg
│   ├── ARCHITECTURE.md
│   └── PROJEKTSTRUKTUR.md
├── README.md
└── ABGABE_LEHRER.md           # Hinweise zur Abgabe
```

## Wichtige URLs

| Route | Beschreibung |
|-------|--------------|
| `/` | Landing Page |
| `/login` | Supabase Auth Login |
| `/register?invite_token=…` | Registrierung mit Einladung |
| `/dashboard` | Kurse + Admin-/Lehrer-Panel |

## API-Routes (Next.js)

| Route | Beschreibung |
|-------|--------------|
| `GET /api/invitations/preview` | Einladung für Registrierungsseite |
| `GET /api/me` | Profil des eingeloggten Nutzers |
| `GET/POST /api/courses` | Kurse laden / anlegen |
| `POST /api/register` | Registrierung mit Einladungstoken |
| `POST /api/invitations` | Einladung erstellen |
| `GET /api/admin/users` | Nutzerliste (Admin) |

## Rollen-Flow

1. Admin in Supabase anlegen → `profiles.role = admin`
2. Admin lädt Lehrkraft ein → `POST /api/invitations`
3. Lehrkraft registriert sich → `POST /api/register`
4. Lehrkraft legt Kurs an → `POST /api/courses`
5. Lehrkraft lädt Schüler:in ein (mit `course_id`)
6. Alle loggen sich mit Supabase Auth ein

Setup: **[docs/SUPABASE_SETUP.md](SUPABASE_SETUP.md)**
