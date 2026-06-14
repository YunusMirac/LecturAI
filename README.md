# LecturAI

Lernplattform für Kurse, Einladungen und Rollen (Admin, Lehrkraft, Schüler:in).

**Stack:** Next.js + Supabase (Auth, PostgreSQL, RLS)

## Schnellstart

```bash
cd frontend
npm install
cp .env.example .env.local   # Keys aus dem Supabase Dashboard
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Dokumentation

| Datei | Inhalt |
|-------|--------|
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | Setup Schritt für Schritt |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architekturüberblick |
| [docs/PROJEKTSTRUKTUR.md](docs/PROJEKTSTRUKTUR.md) | Verzeichnisbaum |
| [docs/AUDIT.md](docs/AUDIT.md) | System-Audit + Feature-Matrix |
| [docs/TESTPLAN.md](docs/TESTPLAN.md) | Manueller + automatischer Testplan |
| [ABGABE_LEHRER.md](ABGABE_LEHRER.md) | Hinweise zur Abgabe |

## Projektstruktur

```text
LecturAI/
├── frontend/     # Next.js App (UI + API-Routes)
├── supabase/     # SQL-Migrationen und Scripts
└── docs/         # Dokumentation
```
