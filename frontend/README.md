# LecturAI Frontend

Next.js App für die LecturAI-Lernplattform.

## Starten

```bash
npm install
cp .env.example .env.local
npm run dev
```

Setup-Anleitung (Supabase Keys, SQL-Migrationen): **[../docs/SUPABASE_SETUP.md](../docs/SUPABASE_SETUP.md)**

## Skripte

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run dev:webpack` | Dev-Server mit Webpack (Fallback) |
| `npm run build` | Produktions-Build |
| `npm run start` | Produktions-Server |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (Unit-Tests) |

## Umgebungsvariablen

Siehe `.env.example`. Wichtig:

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — öffentlich
- `SUPABASE_SERVICE_ROLE_KEY` — **nur serverseitig**, nie im Browser

## Struktur

```text
src/
├── app/              # Seiten + API-Routes (Server page.tsx + *Client.tsx)
├── components/
│   ├── dashboard/    # DashboardAsyncPage, PageUnavailable, …
│   └── quiz/editor/  # QuestionCard, AddQuestionForm, …
└── lib/
    ├── api/          # Client-API (apiFetch in fetch-auth.ts)
    ├── hooks/        # useAsyncResource, useRouteParams, …
    ├── quiz/         # domain.ts — gemeinsame Quiz-Typen
    ├── supabase/     # Supabase Clients
    └── server/
        ├── access/   # course-membership (geteilter Zugriffscheck)
        └── …         # API-Helfer, Validierung, Quiz-Logik
```

Refactoring-Inventar: **[../docs/REFACTORING_INVENTORY.md](../docs/REFACTORING_INVENTORY.md)**
