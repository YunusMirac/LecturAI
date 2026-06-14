# LecturAI — Testplan (Abgabe)

Automatisierte Tests: `cd frontend && npm run test`  
Manuelle Tests: unten mit echtem Supabase-Projekt.

**Voraussetzungen:** Migrationen 001–007 im SQL Editor, `frontend/.env.local` mit allen Keys, Dev-Server (`npm run dev`).

---

## 1. Admin anlegen (einmalig)

1. Supabase Dashboard → User anlegen (E-Mail + Passwort, Auto Confirm)
2. SQL: `profiles` mit `role = 'admin'` für diese UUID
3. Login unter `/login` → Dashboard zeigt Admin-Panel

**Erwartung:** Rolle „Administration“, Lehrkraft einladen sichtbar.

---

## 2. Lehrkraft einladen und registrieren

1. Admin → E-Mail einer Test-Lehrkraft eingeben → „Einladung senden“
2. Link kopieren (oder E-Mail mit Resend)
3. Link im **Inkognito-Fenster** öffnen → `/register?invite_token=…`
4. Seite zeigt E-Mail + Rolle, **nur Passwort-Felder**
5. Passwort setzen → Auto-Login → Dashboard

**Erwartung:** Lehrkraft-Panel sichtbar, Kurs anlegen möglich.

---

## 3. Kurs anlegen

1. Als Lehrkraft: Kursname + optional Semester → anlegen
2. Kurs erscheint in der Kursliste

**Erwartung:** Erfolgsmeldung, Karte in der Liste.

---

## 4. Schüler:in einladen und registrieren

1. Lehrkraft → Schüler-E-Mail + Kurs wählen → einladen
2. Einladungslink im Inkognito öffnen
3. Passwort setzen → Dashboard
4. **Lehrkraft:** Unter „Schüler:innen im Kurs“ prüfen — Status „Registriert“ oder „Einladung offen“

**Erwartung:** Schüler sieht Kurs in der Liste (kein Lehrer-Panel). Lehrkraft sieht beide Status in der Mitgliederliste.

---

## 5. Login / Logout

1. Abmelden → Startseite
2. Erneut `/login` → gleiche Rolle im Dashboard

**Erwartung:** Session funktioniert, `/dashboard` ohne Login → Redirect zu `/login`.

---

## 6. Fehlerfälle

| Aktion | Erwartung |
|--------|-----------|
| `/register` ohne Token | Hinweis „nur mit Einladungslink“ |
| Abgelaufener / falscher Token | Fehlermeldung auf Register-Seite |
| Falsches Login-Passwort | Fehlermeldung auf Login |
| Passwort vergessen → Link anfordern | Erfolgsmeldung (E-Mail wenn Konto existiert) |
| Reset-Link öffnen → neues Passwort | Weiterleitung zu Login, Anmeldung mit neuem Passwort |
| Schüler versucht Kurs anlegen | Nicht möglich (kein UI) |

---

## 7. Automatisierte Tests (CI)

```bash
cd frontend
npm run lint
npm run test
npm run build
```

**Erwartung:** Alle Befehle exit code 0, mindestens 55 Unit-Tests grün.

Vollständiger System-Audit: **[AUDIT.md](AUDIT.md)**

---

## Bekannte Grenzen (Stand Abgabe)

- E-Mail-Versand optional (Resend); sonst Link aus Dashboard kopieren. Passwort-Reset nutzt Supabase-E-Mail.
