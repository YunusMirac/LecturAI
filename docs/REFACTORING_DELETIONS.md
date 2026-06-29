# Refactoring — Lösch-Protokoll (Phase 5)

## Durchgeführt

- Keine Dateien gelöscht (bewusst konservativ).
- Client-Komponenten einheitlich benannt (`*PageClient` als Export-Name).
- Legacy-CSS-Variablen `--lectur-*` in `globals.css` **beibehalten** — `lectur-shine-sweep` und Tailwind-Theme nutzen sie noch.

## Nicht gelöscht (bewusst)

| Kandidat | Grund |
|----------|--------|
| `lib/auth.ts` | Wird von Dashboard, SessionNav, authApi genutzt (`AUTH_CHANGED_EVENT`) |
| `--lectur-*` CSS | Animation/Theme-Referenzen in `globals.css` / `tailwind.config.ts` |
| `lib/api/index.ts` Re-Exports | Barrel für externe Imports |

## Optional später (nach manueller Prüfung)

- `quiz-validation.ts` in parse/normalize/rules aufteilen
- Weitere Client-Seiten auf `DashboardAsyncPage` migrieren
