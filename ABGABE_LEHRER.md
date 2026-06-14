# LecturAI – Hinweise zur Abgabe (Quellcode-Archiv)

Dieses Archiv enthält **nur Quelltext und Konfiguration**. Folgendes ist **nicht** enthalten (wird lokal erzeugt oder ist geheim):

- `node_modules`, `frontend/.next` (Frontend-Build-Cache)
- `backend/venv` (Python-Virtualenv)
- `.git` (Versionsverlauf)
- `.env` / `.env.local` (Zugangsdaten – bitte aus `backend/env.example` bzw. `frontend/.env.example` ableiten)

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Optional Produktions-Build: `npm run build`

## Backend (Django)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Umgebungsvariablen: `backend/env.example` nach `.env` kopieren und anpassen. Es wird mindestens **`DATABASE_URL`** (PostgreSQL) benötigt.

```bash
python manage.py migrate
python manage.py runserver
```

Bei Fragen zur Architektur siehe `docs/ARCHITECTURE.md` und `docs/PROJEKTSTRUKTUR.md`.
