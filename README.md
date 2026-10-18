# Hamro Exam — Backend

API-only Next.js backend (App Router) for the Hamro Exam Expo app. Deploys to
Vercel, backed by MongoDB Atlas + Upstash Redis.

This backend is intentionally **separate** from hamroexam.com's existing
website backend — separate database, separate user accounts. See the
architecture notes below if you later want to unify them.

## Stack

- **Next.js 14 (App Router)** — API routes only, no pages
- **MongoDB Atlas** via Mongoose — source of truth
- **Upstash Redis** — OTP storage, rate limiting, leaderboard cache (nothing else)
- **Resend** — OTP delivery email
- **JWT** (access + refresh, rotation on refresh) — mobile-friendly auth

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run seed                 # bootstraps sample category/faculty/subjects/questions/exams
npm run dev
```

### Required environment variables

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (use two different values) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Redis DB → REST API |
| `RESEND_API_KEY` | resend.com → API Keys (optional in dev — OTPs log to console if unset) |

Deploy: push to GitHub, import into Vercel, add the same env vars in
Vercel → Project → Settings → Environment Variables. MongoDB Atlas network
access should allow `0.0.0.0/0` since Vercel's outbound IPs aren't fixed.

## API Reference

All responses are shaped `{ success: true, data }` or
`{ success: false, error: { message, code } }`. Protected routes require
`Authorization: Bearer <accessToken>`.

### Auth
```
POST /api/auth/register        { name, email, phone, password } -> { userId }
POST /api/auth/verify-otp      { userId, otp }                  -> { accessToken, refreshToken }
POST /api/auth/resend-otp      { userId }
POST /api/auth/login           { email, password }              -> { accessToken, refreshToken }
                                (403 EMAIL_NOT_VERIFIED if unverified)
POST /api/auth/refresh         { refreshToken }                 -> { accessToken, refreshToken }
POST /api/auth/logout          { refreshToken }
GET  /api/auth/me              (auth)                           -> user profile
```

### Content (cached, public)
```
GET /api/categories                     -> cached 30 days
GET /api/faculties?category=<slug>      -> cached 30 days
GET /api/subjects?faculty=<slug>        -> cached 30 days
GET /api/exams?faculty=<slug>&type=practice|mock  -> cached 24h
```

### Exam flow (auth required)
```
GET  /api/home                          -> profile + recent attempts + categories, 1 call
POST /api/exams/start        { examId } -> { attemptId, questions[], duration, ... }
POST /api/attempts/submit    { attemptId, answers[] } -> { score, correct, wrong, ... }
GET  /api/attempts/:id                  -> full result + explanations + subject breakdown
GET  /api/leaderboard?examId=<id>       -> top 50 (cached 5 min) + your rank (live)
```

### Bookmarks (auth required)
```
GET    /api/bookmarks
POST   /api/bookmarks       { questionId }
DELETE /api/bookmarks/:questionId
```

**Total exam-taking cost: 2 API calls** (`start` + `submit`) regardless of
question count — everything in between runs against local app state.

## Design decisions worth knowing before you extend this

- **Options are shuffled server-side per attempt**, mapping stored on the
  `Attempt` document (`answers[].optionOrder`). Grading uses this stored
  order, never the client's. Prevents "answer is always position B" sharing.
- **Duration is enforced server-side.** `startedAt`/`submittedAt` are both
  set by the server; client-sent `timeTaken` per question is stored for
  analytics only and never trusted for scoring or time-limit checks.
- **Mock exams compose across subjects** via `subjectDistribution` on
  `ExamConfig`, sampled per-subject with `$sample`, then the combined
  question order is shuffled so subjects interleave.
- **Leaderboard writes happen after the response is sent** (fire-and-forget
  from `attempt.service.ts`) — a slow or failed leaderboard update never
  delays or breaks the user's submission response.
- **No resume-exam endpoint.** Mid-exam progress is expected to live in the
  Expo app's local state (AsyncStorage). Add
  `GET /api/exams/resume/:attemptId` later only if cross-device resume
  becomes a real requirement.
- **Categories/faculties/subjects use HTTP `Cache-Control`, not Redis** —
  free, and sufficient since this data only changes via the admin dashboard.
  Redis is reserved for OTPs (needs TTL), rate limits, and the leaderboard
  (needs fast invalidation).

## What's not built yet (by design, per current scope)

- Admin dashboard (separate Next.js pages/app, or a separate project — your call)
- Payments (explicitly out of scope for now — add `payments` collection + eSewa/Khalti when ready)
- Push notifications / daily challenge (Phase 2)
- Cross-device exam resume (add only if needed)

## Folder structure

```
src/
  lib/            connection caching, JWT, OTP, rate limiting, response helpers, auth guard
  models/         Mongoose schemas
  services/       business logic (auth, exam composition, scoring, leaderboard)
  app/api/        thin route handlers — parse input, call a service, return a response
scripts/seed.ts   bootstraps sample data for local development
```
there is text in options on other question , have you make mcq for only for image , there is might be image or text

