# LecturAI — Hinweise zur Abgabe

## Stack

- **Frontend:** Next.js (`frontend/`)
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **Kein Django** mehr im Betrieb (`backend/` = Legacy-Referenz)

## Starten

```bash
cd frontend
npm install
cp .env.example .env.local   # Keys aus Supabase Dashboard eintragen
npm run dev
```

Vollständige Anleitung: **`docs/SUPABASE_SETUP.md`**

## Enthalten / nicht enthalten

- ✅ Quellcode Frontend + SQL-Migration
- ❌ `node_modules`, `.next`, `.env.local` (Secrets)
- ❌ Django `venv`

## Erster Admin

Siehe `docs/SUPABASE_SETUP.md` Abschnitt 4 und `supabase/scripts/create_admin.sql`.
