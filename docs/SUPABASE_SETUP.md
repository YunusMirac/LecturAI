# LecturAI — Supabase Setup (Schritt für Schritt)

Nach dem Umbau läuft **alles über Supabase + Next.js**. Django wird **nicht mehr** benötigt.

---

## 1. Supabase Dashboard — Projekt

1. [supabase.com/dashboard](https://supabase.com/dashboard) → dein Projekt öffnen (oder neues anlegen)
2. **Project Settings → API** notieren:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret!) → `SUPABASE_SERVICE_ROLE_KEY` (nur serverseitig)

---

## 2. Datenbank-Schema importieren

1. **SQL Editor → New query**
2. Inhalt von `supabase/migrations/001_lecturai_supabase_only.sql` einfügen
3. **Run**

⚠️ **Löscht alte Django-Tabellen**, falls vorhanden. Vorher Backup machen!

Falls du **„Database error creating new user“** beim Anlegen im Dashboard siehst, danach auch **`002_fix_auth_user_trigger.sql`** ausführen (oder erneut 001 — enthält den Fix jetzt auch).

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
| Redirect URLs | `http://localhost:3000/**` |

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

**Django muss nicht mehr laufen.**

---

## 7. Ablauf testen

1. **Admin** → `/login` → Dashboard → Lehrkraft einladen
2. **Lehrkraft** → Link aus E-Mail oder UI → `/register?invite_token=...` → Passwort → Login
3. **Lehrkraft** → Kurs anlegen → Schüler:in einladen
4. **Schüler:in** → registrieren → Login → Kurs im Dashboard

---

## Architektur (neu)

```text
Next.js Frontend
  ├── supabase-js (Login, Kurse, Profile) + RLS
  ├── /api/register      → Service Role: Konto + Profil + Einladung
  └── /api/invitations   → Service Role: Einladung + optional E-Mail

Supabase
  ├── Auth (auth.users)
  ├── Postgres (profiles, courses, invitations, …)
  └── Row Level Security
```

---

## Pakete (Frontend)

Bereits in `package.json`:

- `@supabase/supabase-js`
- `@supabase/ssr`

Kein `@supabase/auth-helpers-nextjs` nötig — `@supabase/ssr` reicht.

---

## Häufige Fehler

| Problem | Lösung |
|---------|--------|
| „Supabase URL fehlt“ | `.env.local` prüfen, Dev-Server neu starten |
| Login ok, kein Profil | `profiles`-Zeile für User anlegen |
| Kurse leer / 403 | RLS + Rolle in `profiles` prüfen |
| Einladung ohne E-Mail | `RESEND_API_KEY` setzen oder Link aus UI kopieren |
| Migration schlägt fehl | Altes Schema konflikt → neues Supabase-Projekt oder Tabellen droppen |

---

## Django / backend/

Der Ordner `backend/` ist **legacy** und wird nicht mehr für den Betrieb benötigt. Du kannst ihn für die Abgabe behalten oder entfernen — die aktive App ist **frontend + Supabase**.
