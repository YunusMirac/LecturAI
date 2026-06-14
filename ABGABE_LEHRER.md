# LecturAI — Hinweise zur Abgabe

## Stack

- **Frontend:** Next.js (`frontend/`)
- **Backend:** Supabase (Auth + PostgreSQL + RLS)

## Starten

```bash
cd frontend
npm install
cp .env.example .env.local   # Keys aus Supabase Dashboard eintragen
npm run dev
```

Vollständige Anleitung: **`docs/SUPABASE_SETUP.md`**

## Tests

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Manueller Ablauf (Admin → Lehrkraft → Schüler): **`docs/TESTPLAN.md`**

## Enthalten / nicht enthalten

- ✅ Quellcode Frontend + SQL-Migrationen (001–007)
- ✅ Unit-Tests (Vitest, `npm run test`)
- ❌ `node_modules`, `.next`, `.env.local` (Secrets)

## Erster Admin

Siehe `docs/SUPABASE_SETUP.md` Abschnitt 4 und `supabase/scripts/create_admin.sql`.

## Einladungs-Registrierung

Nutzer öffnen den Einladungslink und setzen **nur ein Passwort** — E-Mail und Token kommen aus der Einladung.
