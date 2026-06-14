# LecturAI — Supabase Setup (Schritt für Schritt)

Alles läuft über **Supabase + Next.js** — kein separates Backend.

---

## 1. Supabase Dashboard — Projekt

1. [supabase.com/dashboard](https://supabase.com/dashboard) → dein Projekt öffnen (oder neues anlegen)
2. **Project Settings → API** notieren:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret!) → `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig)

---

## 2. Datenbank-Schema importieren

Im **SQL Editor** nacheinander ausführen:

| Datei | Zweck |
|-------|--------|
| `001_lecturai_supabase_only.sql` | Hauptschema (Tabellen, RLS, Trigger) |
| `002_fix_auth_user_trigger.sql` | Fix bei „Database error creating new user“ |
| `003_fix_profiles_role_trigger.sql` | Kaputte Profile bereinigen |
| `004_fix_rls_and_grants.sql` | RLS-Rekursion + GRANTs |
| `005_fix_courses_rls_recursion.sql` | Fix für 500 auf `courses` |
| `006_profiles_role_immutable.sql` | Schutz: `profiles.role` nicht änderbar |
| `007_register_atomic.sql` | Atomare Registrierung (Profil + Einladung + Kurs) |

⚠️ **001 löscht alte Tabellen**, falls vorhanden. Vorher Backup machen!

---

## 3. Authentication — Dashboard-Einstellungen

Unter **Authentication → Providers → Email**:

| Einstellung | Empfehlung |
|-------------|------------|
| Enable Email provider | ✅ An |
| Confirm email | Optional (Registrierung über Einladung setzt `email_confirm: true`) |
| **Enable sign ups** | ✅ An (Registrierung läuft über `/api/register` mit Einladungstoken) |

Unter **Authentication → URL Configuration**:

| Feld | Wert (lokal) |
|------|----------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/**` (inkl. `/auth/callback`) |

**API-Keys:** In neuen Supabase-Projekten den **Publishable Key** (`sb_publishable_…`) in `.env.local` als `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` setzen. Der alte JWT-`anon`-Key funktioniert oft nicht mehr — dann schlagen Login und Passwort-Reset mit „Load failed“ / „Invalid API key“ fehl.

---

## 4. Ersten Admin anlegen

### Variante A — Dashboard (einfach)

1. **Authentication → Users → Add user**
2. E-Mail + Passwort, **Auto Confirm User** ✅
3. User anklicken → **UUID** kopieren
4. **SQL Editor**:

```sql
INSERT INTO public.profiles (id, email, role)
VALUES (
  'DEINE-USER-UUID-HIER',
  'admin@beispiel.de',
  'admin'
);
```

### Variante B — SQL (wenn User schon existiert)

Siehe `supabase/scripts/create_admin.sql`

---

## 5. Frontend `.env.local`

Im Ordner `frontend/`:

```bash
cp .env.example .env.local
```

Ausfüllen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # geheim!
```

Optional für **automatische Einladungs-E-Mails** (Resend):

```env
RESEND_API_KEY=re_...
INVITE_FROM_EMAIL=LecturAI <onboarding@resend.dev>
```

Ohne Resend: Einladungs-Link wird im Dashboard angezeigt (zum manuellen Weiterleiten).

---

## 6. App starten

```bash
cd frontend
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

---

## 7. Ablauf testen

1. **Admin** → `/login` → Dashboard → Lehrkraft einladen
2. **Lehrkraft** → Einladungslink öffnen → `/register?invite_token=...` → **nur Passwort** setzen → Auto-Login
3. **Lehrkraft** → Kurs anlegen → Schüler:in einladen
4. **Schüler:in** → Link öffnen → Passwort setzen → Kurs im Dashboard

Ausführlicher Testplan: **[docs/TESTPLAN.md](TESTPLAN.md)**

Automatisierte Tests:

```bash
cd frontend && npm run test
```

---

## Einladungs-Flow

1. Lehrkraft/Admin erstellt Einladung → Link `/register?invite_token=…`
2. Register-Seite ruft `GET /api/invitations/preview` auf → E-Mail + Rolle werden angezeigt
3. Nutzer setzt nur Passwort → `POST /api/register` → atomare DB-Funktion `complete_invited_registration`

Optional: **Resend** verschickt den Link per E-Mail (`RESEND_API_KEY`).

---

## Architektur

```text
Next.js Frontend
  ├── supabase-js (Login, Logout, Session)
  ├── GET /api/invitations/preview              → Einladung prüfen (öffentlich)
  ├── /api/me, /api/courses, /api/admin/users   → Service Role
  ├── /api/register                             → Service Role + RPC
  └── /api/invitations                          → Service Role + optional E-Mail

Supabase
  ├── Auth (auth.users)
  ├── Postgres (profiles, courses, invitations, …)
  ├── RPC complete_invited_registration
  └── Row Level Security
```

---

## Pakete (Frontend)

- `@supabase/supabase-js` — Auth + DB
- `@supabase/ssr` — Server-Client für API-Routes

---

## Häufige Fehler

| Problem | Lösung |
|---------|--------|
| **500 auf `/api/me`, `/api/courses`, …** | `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env.local` setzen, Dev-Server neu starten |
| „Supabase URL fehlt“ | `.env.local` prüfen, Dev-Server neu starten |
| Login ok, kein Profil | `profiles`-Zeile für User anlegen (`role = admin\|teacher\|student`) |
| Kurse 500 / Rekursion | Migration `005_fix_courses_rls_recursion.sql` ausführen |
| Einladung ohne E-Mail | `RESEND_API_KEY` setzen oder Link aus UI kopieren |
| Register schlägt mit RPC-Fehler fehl | Migration `007_register_atomic.sql` ausführen |
| Rolle per Browser änderbar | Migration `006_profiles_role_immutable.sql` ausführen |
