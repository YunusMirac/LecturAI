# LecturAI — System-Audit (Stand Abgabe)

Vollständige Prüfung von Auth, Einladungen, Registrierung und Kurs-System.

---

## Executive Summary

| Bereich | Bewertung | Kommentar |
|---------|-----------|-----------|
| Login | ✅ Produktionsreif | Supabase Auth + `/api/me` |
| Registrierung | ✅ Produktionsreif | Invite-only, Preview, Auto-Login, atomare RPC |
| Einladungen | ✅ MVP | Erstellen + Link/E-Mail; keine Liste/Widerruf |
| Kurse anzeigen | ✅ MVP | Rollenbasiert über `/api/courses` |
| Kurse anlegen | ✅ MVP | Nur Lehrkraft/Admin |
| Sicherheit | ✅ Verbessert | Migration 006 blockiert Role-Escalation |
| Tests | ✅ 446 Unit-Tests | `npm run test` |
| Abgabe-Tauglichkeit | ✅ Ja | Mit Migrationen 001–007 in Supabase |

---

## Feature-Matrix (Rolle × Fähigkeit)

| Fähigkeit | Admin | Lehrkraft | Schüler:in |
|-----------|:-----:|:---------:|:----------:|
| Login / Logout | ✅ | ✅ | ✅ |
| Dashboard (geschützt) | ✅ Server-Layout | ✅ | ✅ |
| Lehrkraft einladen | ✅ | ❌ | ❌ |
| Schüler:in einladen | ❌ | ✅ | ❌ |
| Registrierung (Link → Passwort) | — | — | ✅ |
| Alle Kurse sehen | ✅ | ✅ eigene | ✅ Mitgliedschaft |
| Kurs anlegen | ✅ (API) | ✅ | ❌ |
| Kurs bearbeiten/löschen | ✅ | ✅ | ❌ |
| Schülerliste pro Kurs | ✅ | ✅ | ❌ |
| Schüler:in aus Kurs entfernen | ✅ | ✅ | ❌ |
| Passwort vergessen | ✅ | ✅ | ✅ |
| Nutzerliste (Admin) | ✅ | ❌ | ❌ |

---

## API-Endpunkte (Ist)

| Route | Auth | Status |
|-------|------|--------|
| `GET /api/invitations/preview` | Öffentlich | ✅ |
| `POST /api/register` | Öffentlich | ✅ + RPC |
| `POST /api/invitations` | Bearer | ✅ |
| `GET /api/me` | Bearer/Cookie | ✅ |
| `GET/POST /api/courses` | Bearer/Cookie | ✅ |
| `GET /api/courses/[courseId]/members` | Bearer (Lehrkraft/Admin) | ✅ |
| `DELETE /api/courses/[courseId]/members` | Bearer (Lehrkraft/Admin) | ✅ |
| `PATCH/DELETE /api/courses/[courseId]` | Bearer (Lehrkraft/Admin) | ✅ |
| `GET /auth/callback` | Öffentlich (Supabase Code) | ✅ |
| `GET /api/admin/users` | Bearer (Admin) | ✅ |

Kein direkter `supabase.from()`-Zugriff im Browser für Profile/Kurse — alles über API-Routes mit Service Role.

---

## Was funktioniert (verifiziert)

- **Build:** `npm run build` — 6 API-Routes + Seiten kompilieren
- **Lint:** `npm run lint` — ohne Fehler
- **Unit-Tests:** Validierung, Einladungs-Preview, Register-Rollback, Rollen-Checks
- **Einladungs-Flow:** Link → Preview lädt E-Mail → nur Passwort → Auto-Login
- **Passwort-Reset:** `/forgot-password` → Supabase-E-Mail → `/auth/callback` → `/reset-password`
- **Atomare Registrierung:** `complete_invited_registration` (Migration 007)
- **RLS-Fix:** Kein Self-Service-Role-Update (Migration 006)

---

## Kritische Voraussetzungen (manuell)

Diese Schritte musst **du** in Supabase erledigen — im Code allein nicht prüfbar:

1. Migrationen **001–007** im SQL Editor ausführen
2. `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env.local`
3. Admin-Profil in `profiles` anlegen

Ohne **007** schlägt Registrierung mit RPC-Fehler fehl.  
Ohne **006** theoretisch Role-Escalation möglich (praktisch nutzt App keine Client-Updates).

---

## Fehlende Features (bewusst nicht im MVP)

### Wichtig für spätere Versionen

| Feature | Priorität | Aufwand |
|---------|-----------|---------|
| Passwort zurücksetzen (`resetPasswordForEmail`) | — | ✅ umgesetzt |
| Schülerliste pro Kurs anzeigen | — | ✅ umgesetzt |
| Kurs bearbeiten / löschen | Mittel | ~4h |
| Einladungen auflisten / widerrufen | Mittel | ~3h |
| Admin kann Schüler einladen | Niedrig | ~1h |

### Nice-to-have

- E-Mail immer via Resend (ohne Link-Kopieren)
- Rate-Limiting auf `/api/register`
- Kurs-Detailseite `/dashboard/courses/[id]`
- Bulk-Einladung (CSV)
- OAuth (Google/Microsoft)

---

## Sicherheits-Checkliste

| Punkt | Status |
|-------|--------|
| Service Role nur serverseitig | ✅ |
| Invite-only Registrierung | ✅ |
| E-Mail muss zur Einladung passen | ✅ |
| `profiles.role` nicht client-änderbar | ✅ (006) |
| Register atomar (Profil + Einladung + Kurs) | ✅ (007) |
| Dashboard serverseitig geschützt | ✅ `dashboard/layout.tsx` |
| Rate-Limiting | ❌ offen |
| CSRF (Bearer-API) | ✅ üblich für SPA |

---

## Test-Abdeckung

| Modul | Tests |
|-------|-------|
| `register-validation` | Body + Einladungsprüfung |
| `invitation-preview` | Preview-Logik |
| `invitations-validation` | Rollen + Kurs-Validierung |
| `api-helpers` | Token + URL |
| `authApi` | Fehler-Parsing Register |
| `invitationsApi` | Fehler-Parsing Einladung |
| `auth` | Rollen-Labels |
| `guards` | `isRecord` |
| `register/route` | HTTP + Rollback (Mock) |
| `invitations/preview/route` | HTTP (Mock) |

```bash
cd frontend && npm run test   # alle Unit-Tests
```

Manueller E2E: siehe [TESTPLAN.md](TESTPLAN.md)

---

## Empfehlung für die Abgabe

**Jetzt abgeben:** Das System deckt den geforderten Kern ab (Rollen, Einladung, Registrierung, Kurse).

**Vor Demo/Prüfung:**

1. Migrationen 006 + 007 ausführen (falls noch nicht)
2. TESTPLAN Schritte 1–5 einmal durchspielen
3. `npm run test && npm run build` grün zeigen

**Nicht nötig für Abgabe:** Kurs löschen, Passwort-Reset — in mündlicher Prüfung als „Ausblick“ erwähnen.
