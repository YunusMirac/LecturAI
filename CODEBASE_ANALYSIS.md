# LecturAI — Complete Technical Documentation

---

## 1. Project Overview & Purpose

**LecturAI** is a German-language, AI-powered academic examination platform targeting university instructors and students. Its core purpose is to eliminate the manual labor of creating multiple-choice exams: a teacher uploads a lecture PDF, and Google Gemini AI automatically generates a complete, academically valid quiz within seconds.

**Primary use cases:**

- **Teacher flow:** Upload lecture PDF → AI generates quiz questions → review/edit questions → publish → run either a live synchronous "Kahoot-style" game or open an async timed exam (Klausur)
- **Student flow:** Receive course invitation → register → join live quizzes or take timed exams from their course dashboard
- **Admin flow:** Manage all users and courses, send invitations across the platform

**Core business goal:** Make professional-grade exam creation at universities instant and effortless while maintaining academic quality (correct difficulty taxonomy, standalone questions, plausible distractors).

---

## 2. Complete Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript 5 |
| **Frontend framework** | Next.js 16.2.6 (App Router, React 19) |
| **UI components** | shadcn/ui (Radix primitives, Tailwind CSS 4) |
| **Animations** | Framer Motion 12 |
| **Icons** | Lucide React |
| **AI / ML** | Google Gemini API (`@google/generative-ai` 0.24) — `gemini-2.5-flash` primary model |
| **Database** | PostgreSQL via Supabase (managed Postgres + Auth + Storage + RLS) |
| **Auth** | Supabase Auth (email/password, JWT sessions, cookie-based via `@supabase/ssr`) |
| **File storage** | Supabase Storage bucket `course-materials` (private PDFs, max 20 MB) |
| **Server-side client** | `@supabase/supabase-js` with `service_role` key for privileged API routes |
| **Styling** | Tailwind CSS 4, `tw-animate-css`, PostCSS |
| **Testing** | Vitest 4, `@vitejs/plugin-react` |
| **Linting** | ESLint 9, `eslint-config-next` |
| **Build tool** | Next.js (Turbopack default, Webpack fallback via `dev:webpack`) |
| **Runtime env** | Node.js, deployed in Next.js server context |
| **DB migrations** | Raw SQL files in `supabase/migrations/` (applied via Supabase dashboard SQL editor) |

---

## 3. Current Development Status

The project is **functionally complete** across all three major feature areas. The most recent commits confirm:

- Registration system complete (`registrierungssystem complete`)
- Supabase migration (from a prior Django backend) complete
- Quiz & Klausur (exam) modes both complete (`klausur and quiz complete`)

### Fully Implemented Features

- **Invitation-only registration** — tokens emailed to invitees; whitelist prevents open sign-up
- **Role-based access control** — three roles (`admin`, `teacher`, `student`) enforced at DB level via PostgreSQL RLS and at API level via guards
- **Course management** — create, edit, delete courses; semester tagging; teacher ownership
- **Course membership** — students join via invitation; teachers can remove members
- **AI quiz generation** — PDF upload → Gemini API → question pool persisted in DB; retry logic across multiple Gemini model fallbacks (handles quota errors, model shutdowns)
- **Quiz editor** — teachers can add/edit/delete questions and choices post-generation
- **Two quiz modes:**
  - **Live Quiz (Kahoot-style):** Lobby → synchronized questions with countdown timer → reveal phase with leaderboard and choice stats → finished state. Access via 6-character code.
  - **Exam Quiz (Klausur):** Pool-based randomized draw per student, per-difficulty draw counts configurable, countdown timer, auto-submit on timeout, result scoring
- **Exam configuration** — teachers configure draw counts per difficulty (easy/medium/hard) and exam duration
- **Exam results** — per-student detail view with correct/incorrect breakdown; aggregate class results for teachers
- **Admin panel** — user list with role display
- **Auth flows** — login, logout, forgot-password, password reset via email link, email verification
- **Dark/light theme** — flash-free init via inline script; persisted in `localStorage`
- **In-memory rate limiting** — applied on auth-sensitive and quiz-join endpoints
- **Comprehensive unit tests** — Vitest test files alongside virtually every API route and server lib

---

## 4. System Architecture & Data Flow

### High-level Architecture

```
Browser (React 19 Client Components)
    │
    │  HTTP fetch (JSON)
    ▼
Next.js App Router (Node.js Server)
    ├── Middleware (Supabase SSR session refresh + /dashboard guard)
    ├── API Routes (src/app/api/**/route.ts)
    │       ├── createAdminClient()  → Supabase service_role (bypasses RLS)
    │       └── createClient()       → Supabase anon/user (respects RLS)
    ├── Server Components (layout.tsx, page.tsx)
    └── Client Components (*PageClient.tsx, dashboard/page.tsx)
            └── src/lib/api/*.ts  (fetch wrappers over /api routes)
                    │
                    ▼
             Supabase (PostgreSQL + Auth + Storage)
                    │
                    ▼
             Google Gemini API (quiz generation only)
```

### Communication Patterns

**1. Auth:** Browser ↔ Supabase Auth directly via `@supabase/supabase-js` client (login, logout, session refresh). JWTs stored in cookies; middleware refreshes them on every `/dashboard/*` request.

**2. Data API:** All domain operations go through Next.js `/api/*` route handlers. Client components call `src/lib/api/*.ts` fetch wrappers → these call internal `/api` routes → routes use `createAdminClient()` (service_role) for privileged writes, or `createClient()` for user-scoped reads.

**3. Live Quiz polling:** There are no WebSockets. The live quiz UI uses `usePolling` (`src/lib/usePolling.ts`) to call `/api/quizzes/[quizId]/live/play` every ~1.5s. The server function `maybeAdvanceLiveQuiz` runs on each poll, computing whether to transition the quiz state machine (`question → reveal → question/finished`) based on wall-clock time and answer counts. This means the server is stateless; all state lives in the `quizzes` table columns (`live_status`, `current_question_index`, `question_started_at`, `reveal_ends_at`).

**4. AI Generation:** Triggered synchronously during quiz creation. The `/api/courses/[courseId]/quizzes` POST handler: (a) inserts a quiz row with `status: 'generating'`, (b) uploads the PDF to Supabase Storage, (c) calls `runQuizGenerationJob()` which downloads the PDF, calls Gemini, inserts questions/choices, and updates `status` to `draft` or `failed`. The client polls `/api/quizzes/[quizId]` every 2s until `status !== 'generating'`.

### State Management

- **No global client state store** (no Redux/Zustand). Each page/component manages its own state with React `useState`/`useEffect`.
- **Server-authoritative:** All sensitive state (quiz phase, scores, time) lives in Supabase DB and is re-read on each poll.
- **Auth state:** Supabase client fires `onAuthStateChange` events; pages react by calling `getSession()` (a fetch to `/api/me`).

### Complete Data Flow: Student Takes an Exam

```
1. Student navigates to /dashboard/courses/[courseId]/quizzes/[quizId]/take
2. Page → ExamTakePageClient → calls fetchExamPreview() → GET /api/quizzes/[quizId]/exam
3. If no attempt exists → student clicks "Start"
4. POST /api/quizzes/[quizId]/exam/attempt
   → buildStudentExamInstance() draws questions from pool by difficulty (random, seeded)
   → inserts quiz_exam_attempts row + quiz_exam_attempt_questions snapshot
   → returns ExamAttemptState (questions WITHOUT is_correct flags)
5. Student answers → PUT /api/quizzes/[quizId]/exam/attempt (saveExamAnswer)
   → upserts quiz_exam_answers row
6. Student submits (or timer expires) → POST /api/quizzes/[quizId]/exam/submit
   → finalizeExamAttempt() scores answers, writes correct_count / percent_correct
7. Teacher sees results → GET /api/quizzes/[quizId]/exam/results
```

---

## 5. Exhaustive File-by-File Breakdown

### Repository Root

```
/LecturAI/
├── .gitignore
├── README.md                      # Project overview
├── ABGABE_LEHRER.md               # Teacher submission guide
├── package-lock.json              # Root-level lockfile
├── docs/                          # Internal developer documentation
│   ├── ARCHITECTURE.md            # System architecture notes
│   ├── AUDIT.md                   # Security audit checklist / findings
│   ├── LIVE_QUIZ.md               # Live quiz design spec
│   ├── PROJEKTSTRUKTUR.md         # Project structure overview (German)
│   ├── QUIZ_AI.md                 # AI generation docs, model config
│   ├── REFACTORING_DELETIONS.md   # Files removed during Django→Supabase migration
│   ├── REFACTORING_INVENTORY.md   # Inventory of refactored files
│   ├── SUPABASE_SETUP.md          # Supabase setup instructions
│   └── TESTPLAN.md                # Test coverage plan
├── supabase/
│   ├── migrations/                # 12 sequential SQL migration files
│   └── scripts/
│       └── create_admin.sql       # One-time admin user creation helper
└── frontend/                      # Next.js application (main codebase)
```

---

### `supabase/migrations/` — Database Schema (Sequential)

| File | Purpose |
|---|---|
| `001_lecturai_supabase_only.sql` | Drops all old Django tables and legacy triggers; creates `profiles`, `courses`, `course_members`, `invitations` tables; defines `auth_role()`, `is_admin()`, `is_teacher()` security-definer helper functions; all RLS policies for these four tables; `set_updated_at()` trigger |
| `002_fix_auth_user_trigger.sql` | Patches the auth user creation trigger to correctly propagate profile creation on signup |
| `003_fix_profiles_role_trigger.sql` | Fixes role propagation in the profiles trigger |
| `004_fix_rls_and_grants.sql` | Corrects GRANT statements and RLS policy gaps from migration 001 |
| `005_fix_courses_rls_recursion.sql` | Eliminates infinite recursion in the courses SELECT RLS policy (caused by self-referential subquery) |
| `006_profiles_role_immutable.sql` | Makes the `profiles.role` field immutable once set (prevents privilege escalation via self-update) |
| `007_register_atomic.sql` | Wraps the invitation-accept + profile-creation sequence in an atomic stored procedure to prevent partial registration states |
| `008_quizzes.sql` | Creates `quizzes`, `quiz_questions`, `quiz_choices` tables; RLS policies for teacher/student/admin access; creates the `course-materials` private storage bucket |
| `009_live_quiz.sql` | Adds live quiz columns to `quizzes` (`access_code`, `live_status`, `current_question_index`, etc.); creates `quiz_live_participants` and `quiz_live_answers` tables with RLS |
| `010_exam_quiz.sql` | Adds `quiz_type` (`live`/`exam_pool`) column; creates `quiz_exam_attempts` and `quiz_exam_answers` tables; adds `exam_open`, `exam_config_json` to quizzes; RLS for exam tables |
| `011_exam_pool.sql` | Adds `difficulty` column to `quiz_questions`; adds `quiz_exam_attempt_questions` table for the per-student question snapshot; updates `settings_json` pool fields |
| `012_rls_hardening.sql` | Final RLS pass: tightens remaining policy gaps, ensures students cannot see unpublished quiz questions or access other students' attempts |

---

### `frontend/` — Next.js Application

#### Config / Root Files

| File | Purpose |
|---|---|
| `package.json` | npm dependencies and scripts: `dev`, `build`, `start`, `lint`, `test`, `test:watch` |
| `next.config.ts` | Next.js configuration (Turbopack default) |
| `tsconfig.json` | TypeScript config with `@/` path alias mapping to `src/` |
| `tailwind.config.ts` | Tailwind CSS 4 configuration |
| `postcss.config.mjs` | PostCSS config with `@tailwindcss/postcss` plugin |
| `eslint.config.mjs` | ESLint 9 flat config with `eslint-config-next` |
| `vitest.config.ts` | Vitest config with `vite-tsconfig-paths` for `@/` resolution and `@vitejs/plugin-react` |
| `.env.example` | Documents required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` |
| `next-env.d.ts` | Auto-generated Next.js TypeScript declarations |

---

#### `src/middleware.ts`

Route-level middleware. Intercepts every request to `/dashboard/**`. Creates a server-side Supabase client (refreshing the JWT cookie), calls `supabase.auth.getUser()`, and redirects unauthenticated users to `/login?reason=session_expired`. This is the first authentication gate before any server component runs.

---

#### `src/app/` — Application Routes

**`layout.tsx`**
Root layout. Applies Geist/Geist Mono fonts, sets `<html lang="de">`, injects an inline `<script>` that reads `lectur-theme` from localStorage and sets `.dark` on `<html>` before paint (eliminates flash-of-wrong-theme). Wraps all children in `ThemeProvider`.

**`globals.css`**
Global CSS: Tailwind base/components/utilities layers, CSS custom properties for the design system (colors, spacing), glassmorphism `.glass-panel` utility class.

**`not-found.tsx`**
Global 404 page with link back to home.

**`page.tsx`** (Landing Page)
Public marketing page. Client component. Features: animated hero section with gradient headline, process animation (PDF scanner → AI gear → quiz cards), feature card grid, CTA banner, footer. Uses Framer Motion for all animations. Renders `SessionNav` to show Login/Dashboard link depending on auth state.

**`favicon.ico`** — Application icon.

---

#### `src/app/(auth)/` — Authentication Pages (Route Group)

All pages in this group share no special layout — the parentheses mark a Next.js route group for organization only.

| File | Purpose |
|---|---|
| `login/page.tsx` | Login form (email + password). Calls `signInWithPassword()` from `authApi`. Handles `?reason=session_expired` query param to show contextual message. Redirects to `/dashboard` on success. |
| `register/page.tsx` | Registration form. Accepts `?token=` param from email invitation link. Fetches invitation preview to pre-fill email/role. Calls `postRegister()`. Only works with a valid pending invitation token. |
| `forgot-password/page.tsx` | Forgot password form. Calls `requestPasswordReset()` which POSTs to `/api/auth/forgot-password`. Sends Supabase password reset email. |
| `reset-password/page.tsx` | Password reset form (after clicking email link). Calls `updatePasswordAfterReset()`. Validates that the current session is a recovery session before showing the form. |
| `verify-email/` | Email verification landing page (shown after Supabase sends verification email). |

---

#### `src/app/auth/callback/route.ts`

OAuth/magic-link callback handler. Called by Supabase after email confirmation or OAuth redirect. Exchanges the `code` param for a session via `supabase.auth.exchangeCodeForSession()`, then redirects to `/dashboard`. Has a companion `route.test.ts`.

---

#### `src/app/api/` — REST API Routes

All routes follow Next.js App Router conventions: `route.ts` exports named HTTP verb handlers (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`). Every handler that needs elevated privileges creates an `adminClient` (service_role). Routes validate user sessions, check role/ownership, then delegate business logic to `src/lib/server/` helpers.

**`api/me/route.ts`**
`GET` — Returns the current user's session (email, role, userId) by querying `profiles` table via the user-scoped client. Used by the client `getSession()` wrapper to check auth state without exposing the service key.

**`api/register/route.ts` + `route.test.ts`**
`POST` — Validates invitation token, validates password strength, atomically calls a Supabase stored procedure that: accepts the invitation, creates the `auth.users` entry, creates the `profiles` row with correct role. Rate-limited (5 req / 15 min per IP).

**`api/auth/forgot-password/route.ts` + `route.test.ts`**
`POST` — Validates email format, calls `supabase.auth.resetPasswordForEmail()` with a redirect URL. Rate-limited (3 req / 15 min per IP). Always returns 200 (no email enumeration).

**`api/admin/users/route.ts`**
`GET` — Admin-only. Returns all profiles ordered by created_at. Guards: must be authenticated + role = admin.

**`api/courses/route.ts`**
`GET` — Returns all courses the current user can see (via RLS: their own courses as teacher, or enrolled courses as student). `POST` — Teacher/admin creates a new course.

**`api/courses/[courseId]/route.ts` + `route.test.ts`**
`GET` — Single course detail (name, semester, role context). `PATCH` — Update name/semester (teacher/admin only). `DELETE` — Delete course (teacher/admin only; protected — cannot delete if quizzes exist).

**`api/courses/[courseId]/members/route.ts` + `route.test.ts`**
`GET` — List all members of a course (teacher/admin only). `DELETE` — Remove a specific member.

**`api/courses/[courseId]/quizzes/route.ts` + `route.test.ts`**
`GET` — List all quizzes for a course (published ones for students, all for teachers). `POST` — Teacher creates a new quiz: accepts `multipart/form-data` with PDF + settings JSON, inserts quiz row with `status: 'generating'`, uploads PDF to Storage, kicks off `runQuizGenerationJob()` (Gemini call + question insertion), returns the new quiz ID immediately while generation runs.

**`api/invitations/route.ts` + `route.test.ts`**
`POST` — Teacher/admin creates an invitation. Validates email uniqueness, generates a secure random token, persists to `invitations` table, sends invite email via Supabase Auth.

**`api/invitations/preview/route.ts` + `route.test.ts`**
`GET ?token=` — Public endpoint (no auth required). Returns invitation metadata (email, role, course name, expiry) for the registration form to pre-fill. Validates token is pending and not expired.

**`api/quizzes/[quizId]/route.ts` + `route.test.ts`**
`GET` — Quiz detail (title, status, generation_error, settings, questions+choices). `PATCH` — Update quiz title. `DELETE` — Delete quiz.

**`api/quizzes/[quizId]/publish/route.ts` + `route.test.ts`**
`POST` — Teacher publishes a draft quiz. Validates quiz has at least one question with at least one correct choice. Sets `status: 'published'`, `published_at: now()`.

**`api/quizzes/[quizId]/questions/route.ts` + `route.test.ts`**
`POST` — Add a new question to a quiz (teacher only).

**`api/quizzes/[quizId]/questions/[questionId]/route.ts` + `route.test.ts`**
`PATCH` — Update question prompt or difficulty. `DELETE` — Delete question.

**`api/quizzes/[quizId]/questions/[questionId]/choices/route.ts` + `route.test.ts`**
`POST` — Add a choice to a question.

**`api/quizzes/[quizId]/questions/[questionId]/choices/[choiceId]/route.ts` + `route.test.ts`**
`PATCH` — Update choice text or `is_correct` flag (enforces exactly one correct choice per question). `DELETE` — Delete choice.

**`api/quizzes/[quizId]/join/route.ts` + `route.test.ts`**
`POST` — Student joins a live quiz by access code. Validates code matches quiz, quiz is open (`live_open = true`), student is enrolled in the course. Upserts a `quiz_live_participants` row.

**`api/quizzes/[quizId]/live/route.ts` + `route.test.ts`**
`GET` — Host state for teacher (participant list, current question with correct answer visible, leaderboard, choice stats). `POST` — Teacher control actions: `open_lobby`, `start`, `next_question`, `close`. Each action transitions `live_status` in the DB.

**`api/quizzes/[quizId]/live/play/route.ts` + `route.test.ts`**
`GET` — Player state for student (current question WITHOUT `is_correct`, their own answer, timer, leaderboard on reveal). Also calls `maybeAdvanceLiveQuiz()` on each request, driving the state machine forward based on elapsed time and answer counts.

**`api/quizzes/[quizId]/exam/route.ts` + `route.test.ts`**
`GET` — Returns exam metadata for students (is it open, are they enrolled, did they already attempt). Teacher sees full config + open/close control.

**`api/quizzes/[quizId]/exam/attempt/route.ts` + `route.test.ts`**
`POST` — Student starts their exam attempt. Calls `startExamAttempt()` which draws a random per-difficulty question subset, creates attempt row + snapshot rows, returns questions without correct answers.
`PUT` — Student saves a single answer (upserts `quiz_exam_answers`). Validates attempt is in-progress, not timed out, question belongs to this student's snapshot.

**`api/quizzes/[quizId]/exam/submit/route.ts` + `route.test.ts`**
`POST` — Student submits exam. Calls `finalizeExamAttempt()` which scores all answers, writes `correct_count`, `total_count`, `percent_correct`, `submitted_at`, `submit_reason: 'manual'`.

**`api/quizzes/[quizId]/exam/results/route.ts` + `route.test.ts`**
`GET` — Teacher sees summary of all student attempts for this exam (email, score, % correct, submission time).

**`api/quizzes/[quizId]/exam/results/[userId]/route.ts`**
`GET` — Teacher sees per-question detail for a specific student: which choice they selected, whether it was correct, what the correct answer was.

---

#### `src/app/dashboard/` — Dashboard Pages

**`layout.tsx`**
Server component layout. Calls `supabase.auth.getUser()` and redirects to `/login` if no session. Second authentication gate (middleware is the first).

**`page.tsx`** (Dashboard Home)
Client component. Shows role-appropriate UI: Admin gets `AdminPanel`, Teacher gets `TeacherPanel`, Student gets a hint to browse courses. Lists all accessible courses. Listens to `supabase.auth.onAuthStateChange` for session expiry. Handles graceful logout.

**`not-found.tsx`**
Dashboard-scoped 404.

**`courses/[courseId]/page.tsx` + `CoursePageClient.tsx`**
Course detail page. Lists quizzes for this course. Teacher sees all; students see only published quizzes with Join buttons. `CoursePageClient` is the interactive client component; `page.tsx` is the thin server wrapper.

**`courses/[courseId]/edit/page.tsx` + `CourseEditPageClient.tsx`**
Edit course name and semester (teacher/admin only).

**`courses/[courseId]/quizzes/new/page.tsx` + `QuizNewPageClient.tsx`**
New quiz creation form. Shows `QuizTypeSelector` (Live Quiz or Exam Pool). Based on type, renders `LiveQuizFields` or `ExamPoolFields`. Handles PDF file upload via `createQuizFromPdf()`. Polls quiz status every 2s after submission until generation is complete or failed.

**`courses/[courseId]/quizzes/[quizId]/page.tsx` + `QuizEditorPageClient.tsx`**
Quiz editor. Shows all questions and choices. Teacher can edit prompts, toggle correct answers, add/delete questions and choices. Also shows Publish button (validates minimum question count).

**`courses/[courseId]/quizzes/[quizId]/exam/page.tsx` + `ExamManagePageClient.tsx`**
Exam management for teacher. Shows `ExamConfigForm` (set draw counts per difficulty, duration), `ExamControlPanel` (open/close exam), and link to results.

**`courses/[courseId]/quizzes/[quizId]/exam/results/page.tsx` + `ExamResultsPageClient.tsx`**
Teacher's view of all student exam results. Sortable table of scores and submission times.

**`courses/[courseId]/quizzes/[quizId]/exam/results/[userId]/page.tsx` + `ExamResultDetailPageClient.tsx`**
Per-student exam result detail: question-by-question breakdown showing what the student answered vs. correct answer.

**`courses/[courseId]/quizzes/[quizId]/join/page.tsx` + `QuizJoinPageClient.tsx`**
Student enters access code to join a live quiz. Calls `joinQuizByCode()`. Redirects to the play page.

**`courses/[courseId]/quizzes/[quizId]/live/page.tsx` + `QuizLiveHostPageClient.tsx`**
Teacher's live quiz host view. Shows participant list in lobby, then current question with choice stats bar chart, leaderboard, and control buttons (Next, Finish). Polls every ~1.5s.

**`courses/[courseId]/quizzes/[quizId]/take/page.tsx` + `ExamTakePageClient.tsx`**
Student's exam-taking interface. Shows questions one at a time, countdown timer, auto-submit on timeout. Saves each answer via `PUT /api/quizzes/[quizId]/exam/attempt` as the student selects.

**`quiz/[quizId]/play/page.tsx` + `QuizPlayPageClient.tsx`**
Student's live quiz player view. Polls every ~1.5s. Shows waiting lobby, then question + choice buttons (disabled after selection), then reveal with correct answer highlighted + top-3 leaderboard, then final leaderboard.

**`quiz/join/`**
Alternative join entry point (access code entry for students who navigate here directly).

---

#### `src/components/` — Reusable Components

**`theme/ThemeProvider.tsx`**
Context provider for dark/light theme. Reads initial theme from `localStorage`, exposes `theme`, `toggleTheme`, `mounted` via `useTheme()` hook. Writes changes back to localStorage. Default: dark.

**`landing/BlobBackground.tsx`**
Animated SVG blob gradients rendered as a fixed background on the landing page. Pure visual.

**`landing/MarketingAuthShell.tsx`**
Layout shell used by dashboard pages. Provides a consistent header (LecturAI logo + session nav) and main content area with optional `wide` variant for full-width dashboard layouts.

**`landing/SessionNav.tsx`**
Navigation bar item that shows "Dashboard" when logged in or "Login" when not. Fetches session state on mount via `getSession()`.

**`dashboard/AdminPanel.tsx`**
Admin-only panel. Fetches all users via `fetchAdminUsers()` and renders them in a table showing email and role.

**`dashboard/TeacherPanel.tsx`**
Teacher-only panel. Shows a "Create Course" form (name + optional semester). Calls `createCourse()` and triggers a courses list refresh via callback.

**`dashboard/CoursesTable.tsx`**
Renders the teacher's course list as a sortable table with Edit and Delete actions. Delete confirms before calling `deleteCourse()`.

**`dashboard/CourseInviteSection.tsx`**
Invite form inside the course detail page. Lets teacher send invitations by email, selecting role (teacher/student) and optionally a linked course.

**`dashboard/CourseMembersSection.tsx`**
Lists course members with Remove buttons. Calls `removeCourseMember()`.

**`dashboard/DashboardAsyncPage.tsx`**
Generic async page wrapper handling loading/error states with consistent spinner/error UI.

**`dashboard/DashboardBackLink.tsx`**
Reusable "← Back" navigation link for nested dashboard pages.

**`dashboard/PageUnavailable.tsx`**
Shown when a page is inaccessible (e.g., wrong role, course not found).

**`quiz/AccessCodePanel.tsx`**
UI panel for entering a 6-character live quiz access code.

**`quiz/editor/QuestionCard.tsx`**
Individual question card in the quiz editor. Shows prompt (editable inline), difficulty badge, all choices with correct/incorrect toggle, and Add/Delete choice buttons.

**`quiz/editor/AddQuestionForm.tsx`**
Inline form to add a new question to a quiz.

**`quiz/editor/ExamDifficultySections.tsx`**
Groups questions by difficulty level (Easy / Medium / Hard) in the editor view for exam-pool quizzes.

**`quiz/editor/quiz-editor-utils.ts`**
Utility functions shared across quiz editor components (e.g., choice validation, sort helpers).

**`quiz/exam/ExamConfigForm.tsx`**
Form for configuring exam draw counts (how many easy/medium/hard questions per student) and duration. Validates that draw counts don't exceed pool size.

**`quiz/exam/ExamControlPanel.tsx`**
Teacher controls to open/close an exam. Toggles `exam_open` on the quiz.

**`quiz/live/LiveChoiceGrid.tsx`**
Grid of 4 answer buttons for the live quiz player. Color-codes on reveal (green = correct, red = wrong). Disables all buttons after selection.

**`quiz/live/LiveLeaderboardList.tsx`**
Ranked list of top players with scores. Used in reveal phase and finished state.

**`quiz/live/LiveRevealPanel.tsx`**
Post-question reveal UI showing choice distribution (bar chart), correct answer, and top-3 leaderboard.

**`quiz/live/LiveTimerBar.tsx`**
Animated countdown progress bar for live quiz question phase.

**`quiz/new/QuizTypeSelector.tsx`**
Two-option toggle: "Live Quiz" vs "Klausur (Exam Pool)". Controls which form fields are shown.

**`quiz/new/LiveQuizFields.tsx`**
Form fields for Live Quiz creation: question count, choices per question, difficulty, seconds per question.

**`quiz/new/ExamPoolFields.tsx`**
Form fields for Exam Pool creation: pool counts per difficulty (easy/medium/hard questions to generate), draw counts per difficulty, exam duration.

---

#### `src/lib/` — Business Logic Layer

##### `src/lib/supabase/`

| File | Purpose |
|---|---|
| `env.ts` | Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from env; throws if missing |
| `env.test.ts` | Tests env var validation |
| `client.ts` | Creates browser-side Supabase client (cookie-based session via `@supabase/ssr`) |
| `server.ts` | Creates server-side Supabase client (reads cookies from Next.js `headers()`) |
| `admin.ts` | Creates service_role Supabase client (full DB access, no RLS); only used in API routes |

##### `src/lib/api/` — Client-side API wrappers

| File | Purpose |
|---|---|
| `index.ts` | Re-exports everything from all API modules; single import point for components |
| `guards.ts` | `isRecord()` — runtime type narrowing for JSON payloads |
| `fetch-auth.ts` + `fetch-auth.test.ts` | Authenticated fetch wrapper: gets Bearer token from Supabase session, attaches to `Authorization` header, returns typed result with `unauthorized`/`network`/`server` error reasons |
| `authApi.ts` + `authApi.test.ts` | `signInWithPassword()`, `signOut()`, `getSession()`, `getAccessToken()`, `postRegister()`, `fetchInvitationPreview()`, `requestPasswordReset()`, `updatePasswordAfterReset()`, `hasPasswordRecoverySession()`, `buildPasswordResetRedirectUrl()` |
| `adminUsersApi.ts` | `fetchAdminUsers()` — GET /api/admin/users |
| `coursesApi.ts` | `fetchCourses()`, `createCourse()`, `updateCourse()`, `deleteCourse()`, `fetchCourseDetail()`, `fetchCourseQuizzes()` |
| `courseMembersApi.ts` + `courseMembersApi.test.ts` | `fetchCourseMembers()`, `removeCourseMember()`, `parseCourseMembersPayload()` |
| `invitationsApi.ts` + `invitationsApi.test.ts` | `postInvitation()`, `fetchInvitationPreview()` |
| `quizzesApi.ts` + `quizzesApi.test.ts` | `fetchCourseDetail()`, `fetchCourseQuizzes()`, `createQuizFromPdf()`, `fetchQuizDetail()`, `publishQuiz()`, `updateQuestion()`, `deleteQuestion()`, `updateChoice()`, `addQuestion()`, `addChoice()`, `deleteChoice()`, `deleteQuiz()` |
| `quizLiveApi.ts` | `fetchQuizJoinPreview()`, `joinQuizByCode()`, `fetchLiveHostState()`, `liveHostAction()`, `fetchLivePlayState()`, `submitLiveAnswer()` |
| `examApi.ts` | `fetchExamMeta()`, `fetchExamPreview()`, `examTeacherAction()`, `saveExamAnswer()`, `submitExam()`, `fetchExamResults()`, `fetchExamResultDetail()` |
| `password-reset.test.ts` | Tests for password reset flow |

##### `src/lib/server/` — Server-side Business Logic

| File | Purpose |
|---|---|
| `quiz-types.ts` | Re-exports domain types; defines `QuizSettings`, `ExamConfig`, `QuizRow`, `QuizChoiceRow`, `QuizQuestionRow`, `QuizQuestionWithChoices`, `QuizDetail`, `GeneratedQuizPayload`, `AttemptQuestionSnapshot` |
| `quiz-db.ts` + `quiz-db.test.ts` | All direct DB operations: `loadQuizDetail()`, `insertGeneratedQuestions()`, `countQuestionsByDifficulty()`, `loadAttemptQuestionSnapshot()`, `persistAttemptQuestionSnapshot()`, `deleteExamAttempt()`, `allocateFreshAccessCode()`, `buildPdfStoragePath()` |
| `quiz-gemini.ts` + `quiz-gemini.test.ts` | Gemini model resolution, quota/rate-limit error detection, retry delay parsing, user-facing error message formatting |
| `quiz-generation.ts` + `quiz-generation.test.ts` | `generateQuizFromPdf()` — builds Gemini prompt, sends PDF as base64, parses JSON response, validates/normalizes payload, retries on quota errors. `runQuizGenerationJob()` — orchestrates the full flow from storage download to DB insert |
| `quiz-validation.ts` + `quiz-validation.test.ts` | Validates `GeneratedQuizPayload` against expected question/choice counts; `parseExamConfig()`, `resolveEffectiveDrawCounts()`, `countQuestionsInPool()`, `resolveExamDuration()` |
| `quiz-validation-normalize.ts` + `quiz-validation-normalize.test.ts` | Normalizes AI output (handles mixed-case field names, string booleans, etc.) |
| `quiz-validation-parse.ts` | Low-level JSON parsing of quiz settings and exam config |
| `quiz-validation-rules.ts` | Pure validation predicates (question count, choice count, single correct answer) |
| `quiz-generation-prompt.test.ts` | Tests for `buildPrompt()` |
| `quiz-live.ts` + `quiz-live.test.ts` | All live quiz state machine logic: `maybeAdvanceLiveQuiz()`, `buildLivePlayState()`, `buildLiveHostState()`, `buildLeaderboard()`, `buildChoiceStats()`, `computePoints()`, `computeSecondsRemaining()` |
| `quiz-live-types.ts` | TypeScript types: `LiveStatus`, `LiveQuizRow`, `LiveParticipant`, `LiveLeaderboardEntry`, `ChoiceStat`, `LiveQuestionView`, `LivePlayState`, `LiveHostState` |
| `quiz-live-join.ts` + `quiz-live-join.test.ts` | `joinLiveQuiz()` — validates enrollment, quiz open state, upserts participant row |
| `quiz-exam.ts` + `quiz-exam.test.ts` | Full exam lifecycle: `startExamAttempt()`, `buildExamAttemptState()`, `saveExamAnswer()`, `finalizeExamAttempt()`, `maybeAutoSubmitExam()`, `loadExamResults()`, `loadExamResultDetail()`, `scoreExamAnswers()`, `computeExamSecondsRemaining()` |
| `quiz-exam-draw.ts` + `quiz-exam-draw.test.ts` | Randomized question draw: `buildStudentExamInstance()`, `sampleQuestionsByDifficulty()`, `shuffleQuestionIds()`, `orderQuestionsBySnapshot()`, Fisher-Yates shuffle with pluggable RNG |
| `quiz-exam-types.ts` | TypeScript types for exam attempt state, question view (no `is_correct`), result summary/detail |
| `quiz-exam-pool.integration.test.ts` | Integration tests for the full pool draw → snapshot → score cycle |
| `quiz-access-code.ts` + `quiz-access-code.test.ts` | `generateAccessCode()` — generates a 6-char alphanumeric code, collision-safe |
| `quiz-fixtures.ts` | Test fixture factories for quiz/question/choice objects |
| `http-errors.ts` + `http-errors.test.ts` | Standardized `NextResponse` factories: `notFoundResponse()`, `internalErrorResponse()`, `rateLimitResponse()`, `missingServiceRoleResponse()` |
| `rate-limit.ts` + `rate-limit.test.ts` | In-memory token bucket rate limiter (Map-based, resets per window). `enforceRateLimit()`, `checkRateLimit()`, `getClientIp()` |
| `api-helpers.ts` + `api-helpers.test.ts` | Shared API route helpers: authentication guard, role check, JSON body parsing with error handling |
| `course-access.ts` + `course-access.test.ts` | `checkCourseAccess()` — verifies user is teacher/admin of a course or is an enrolled student |
| `require-course-access.ts` | Higher-order helper that wraps a route handler, returns 403 if course access check fails |
| `require-managed-course.ts` | Requires caller is teacher/admin of the specific course; 403 otherwise |
| `require-managed-quiz.ts` + `require-managed-quiz.test.ts` | Requires caller is teacher/admin of the course owning the quiz |
| `require-quiz-course-access.ts` | Student/teacher access gate for quiz routes |
| `course-members.ts` + `course-members.test.ts` | `fetchCourseMembers()`, `removeMember()` server-side implementations |
| `student-course-enrollment.ts` + `student-course-enrollment.test.ts` | `isStudentEnrolledInCourse()` — checks `course_members` table |
| `invitation-preview.ts` + `invitation-preview.test.ts` | `fetchInvitationPreview()` — resolves token to invitation details |
| `invitations-validation.ts` + `invitations-validation.test.ts` | Validates invitation email/role/course fields |
| `page-access.ts` | Server-side helpers for page-level authorization (called from Server Components) |
| `password-validation.ts` + `password-validation.test.ts` | Password strength rules (min length, complexity) |
| `register-validation.ts` + `register-validation.test.ts` | Registration payload validation |
| `access/course-membership.ts` | Low-level course membership query abstraction |

##### `src/lib/quiz/`

| File | Purpose |
|---|---|
| `domain.ts` | Core domain types and pure functions: `QuizDifficulty` (`easy`/`medium`/`hard`), `QuizStatus` (`generating`/`draft`/`published`/`failed`), `QuizType` (`live`/`exam_pool`), `DifficultyCounts`, `emptyDifficultyCounts()`, `totalDifficultyCounts()` |

##### `src/lib/` (root-level)

| File | Purpose |
|---|---|
| `auth.ts` + `auth.test.ts` | `ProfileRole` type, `UserSession` type, `roleLabelDe()` (role → German label), `notifyAuthChanged()` (dispatches custom DOM event), `AUTH_CHANGED_EVENT` constant |
| `auth-logout.ts` + `auth-logout.test.ts` | `performLogout()` — calls Supabase signOut, dispatches `AUTH_CHANGED_EVENT`, navigates to target path |
| `quiz-labels.ts` + `quiz-labels.test.ts` | `difficultyLabelDe()`, `statusLabelDe()`, `quizTypeLabelDe()` — display strings for enum values |
| `quiz-visibility.ts` + `quiz-visibility.test.ts` | `canStudentSeeQuiz()`, `canTeacherEditQuiz()` — pure role+status visibility predicates |
| `quiz-live-constants.ts` | `QUESTION_SECONDS` (30s default), `REVEAL_SECONDS_FAST` (5s), `REVEAL_SECONDS_SLOW` (8s) |
| `quiz-exam-constants.ts` | `EXAM_DURATION_SECONDS` (default exam duration) |
| `usePolling.ts` | `usePolling(load, intervalMs, enabled)` — React hook that calls `load` on a setInterval while `enabled`. Used by live quiz and generation-status polling. |

##### `src/lib/hooks/`

| File | Purpose |
|---|---|
| `useActionState.ts` | Generic hook for managing async action state (loading, error, data) with a dispatch function |
| `useAsyncResource.ts` | Hook for data fetching with loading/error states |
| `useRouteParams.ts` | Type-safe wrapper around Next.js `useParams()` |

##### `src/lib/ui/`

| File | Purpose |
|---|---|
| `form-classes.ts` | Shared Tailwind class strings for form inputs, labels, error messages — keeps styling consistent across all forms |

##### `src/lib/test/`

| File | Purpose |
|---|---|
| `route-test-helpers.ts` | Test utilities: `mockRequest()` (builds a mock `NextRequest`), mock Supabase client factories for unit tests |

##### `src/shadcn/`

| File | Purpose |
|---|---|
| `tailwind.css` | shadcn/ui Tailwind CSS variable definitions (design tokens for colors, radius, etc.) |

---

### `public/`

Static assets served directly: `favicon.ico` and any other public files (currently minimal).

---

## Summary

LecturAI is a production-complete, invitation-gated SaaS platform built on a **Next.js 16 monolith** with **Supabase as the entire backend** (auth, DB, storage). Its most technically sophisticated pieces are:

1. **The AI generation pipeline** — resilient multi-model Gemini calls with retry, validation, and normalization of structured JSON output from unstructured PDFs
2. **The serverless live quiz state machine** — polling-based synchronization without WebSockets, with the DB as the sole source of truth
3. **The exam randomization engine** — per-student cryptographic-quality question draws with immutable snapshots, supporting per-difficulty quotas
4. **Multi-layer RLS security** — PostgreSQL Row Level Security as the primary defense, with redundant application-layer guards in every API route
