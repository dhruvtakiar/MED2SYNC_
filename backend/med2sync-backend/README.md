# MED2SYNC — Backend

*Medical Volunteer Coordination Platform*

Node.js + Express + MongoDB (Mongoose) backend, with JWT auth, role-based
access control, and an AI-assisted volunteer↔opportunity matching feature.

## 1. Setup (5 minutes)

```bash
cd medvol-backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — point this at a local MongoDB, or a free MongoDB Atlas cluster
  (fastest for a demo: create a free cluster at mongodb.com/atlas, copy the
  connection string here).
- `JWT_SECRET` — any long random string.
- Leave `ENABLE_AI_EXPLANATIONS=false` unless you have an Anthropic API key —
  the matching feature works fully without it (see section 4).

```bash
npm run seed   # creates demo accounts + walks one volunteer through the whole
               # flow: event -> 2 roles -> approved application -> shift -> attendance
npm run dev    # starts the server on http://localhost:5000 (nodemon, auto-restart)
```

Demo accounts created by the seed script:
- **Admin:** `admin@medvol.com` / `Admin@123`
- **Volunteer:** `volunteer@medvol.com` / `Volunteer@123`

Give your frontend friend the base URL `http://localhost:5000/api` and the
endpoint list below.

## 2. Architecture

```
server.js            entry point, mounts all routes
config/db.js          MongoDB connection
models/                Mongoose schemas (see section 3)
middleware/auth.js     JWT verification (protect) + role check (authorize)
controllers/           request handlers, one file per resource
routes/                route definitions, wire middleware to controllers
utils/matchingEngine.js  deterministic skill/availability scoring
utils/aiExplain.js       optional LLM explanation layer (see section 4)
scripts/seed.js        demo data for local dev / viva
```

Standard three-layer pattern: **routes → controllers → models**. Routes
only wire middleware + controller; controllers hold logic; models hold
schema + validation.

## 3. Data model

This follows the flow: **Event → Role → Apply → Review/Approve → Shift Assignment → Attendance → Hours Report.**

| Model | Key fields | Relationships |
|---|---|---|
| `User` | name, email, password (hashed), role (`volunteer`/`admin`) | — |
| `VolunteerProfile` | specialization, availability[], isVerified | → `User` (1:1), → `Skill` (many:many) |
| `Skill` | name, category | — |
| `Event` | title, organization, location, startDate, endDate, status | → `User` (createdBy) |
| `Role` | title, requiredSkills[], capacity, filledCount | → `Event`, → `Skill` (many:many) |
| `Application` | status (pending/approved/rejected) | → `User` (volunteer), → `Event`, → `Role` |
| `ShiftAssignment` | shiftStart, shiftEnd, status (active/completed/cancelled) | → `Application`, → `User`, → `Event`, → `Role` |
| `Attendance` | checkInTime, checkOutTime, status, `hoursLogged` (virtual) | → `ShiftAssignment` (1:1), → `User` |
| `Notification` | title, message, type, isRead | → `User` |

An `Event` (e.g. "Rural Health Camp") has multiple `Role`s (e.g. "Triage Nurse",
capacity 3; "General Physician", capacity 2) — each with its own required
skills and capacity. A volunteer applies to a **role**, not the event as a
whole, which is what makes capacity and matching meaningful per-role.

## 4. The AI feature: skill-based matching

Two admin/volunteer-facing endpoints rank the best-fit matches:

- `GET /api/match/role/:id` (admin) — ranks all verified volunteers by fit
  for one role.
- `GET /api/match/volunteer/me` (volunteer) — ranks all open roles (across
  all open events) by fit for the logged-in volunteer.

The score is computed by `utils/matchingEngine.js`: **70% skill overlap +
30% availability**, deterministic and explainable — good for walking an
examiner through the exact logic in a viva.

On top of that, `utils/aiExplain.js` optionally calls the Claude API to turn
the score into a one-sentence natural-language explanation ("Why is this a
good/bad match?"). It's fully optional:
- `ENABLE_AI_EXPLANATIONS=false` (default) → returns a template sentence,
  zero external calls, zero API key needed. Everything still works.
- `ENABLE_AI_EXPLANATIONS=true` + a real `ANTHROPIC_API_KEY` → each match
  gets an LLM-generated explanation, with automatic fallback to the
  template if the API call ever fails.

This split is worth mentioning in the viva: the core matching logic is
your own explainable algorithm, and the LLM is an enhancement layer on top
of it, not a black box the whole feature depends on.

## 5. API reference

All protected routes need `Authorization: Bearer <token>` (token returned
by register/login).

**Auth**
- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me`

**Skills**
- `GET /api/skills` (public)
- `POST /api/skills` (admin) `{ name, category }`
- `DELETE /api/skills/:id` (admin)

**Volunteers**
- `GET /api/volunteers/me` (volunteer)
- `PUT /api/volunteers/me` (volunteer) `{ phone, bio, specialization, yearsOfExperience, skills[], availability[], location }`
- `GET /api/volunteers` (admin) `?verified=true&skill=<id>`
- `GET /api/volunteers/:id` (admin)
- `PATCH /api/volunteers/:id/verify` (admin)

**Events**
- `GET /api/events` (public — shows only "open"; admin sees all + can filter `?status=`)
- `GET /api/events/:id` (public — includes its roles)
- `POST /api/events` (admin) `{ title, description, organization, location, startDate, endDate }`
- `PUT /api/events/:id` (admin)
- `DELETE /api/events/:id` (admin — also deletes its roles)

**Roles** (nested under an event)
- `GET /api/events/:eventId/roles` (public)
- `POST /api/events/:eventId/roles` (admin) `{ title, description, requiredSkills[], capacity }`
- `GET /api/roles/:id` (public)
- `PUT /api/roles/:id` (admin)
- `DELETE /api/roles/:id` (admin)

**Applications**
- `POST /api/applications` (volunteer) `{ roleId, message }`
- `GET /api/applications/me` (volunteer)
- `GET /api/applications` (admin) `?eventId=&roleId=&status=`
- `PATCH /api/applications/:id` (admin) `{ status: "approved" | "rejected" }`

**Shift assignments**
- `POST /api/shifts` (admin) `{ applicationId, shiftStart, shiftEnd }`
- `GET /api/shifts` (both — admin sees all, volunteer sees own)
- `PATCH /api/shifts/:id` (admin) `{ status }`

**Attendance**
- `POST /api/attendance/check-in` (volunteer) `{ shiftAssignmentId }`
- `POST /api/attendance/check-out` (volunteer) `{ shiftAssignmentId }`
- `GET /api/attendance` (both — admin sees all + `?status=`, volunteer sees own)
- `PATCH /api/attendance/:id` (admin) `{ checkInTime, checkOutTime, status }` — manual override (e.g. mark no-show)

**Hours report**
- `GET /api/reports/hours` (admin) `?volunteerId=&from=&to=` — total hours + shifts completed, per volunteer
- `GET /api/reports/hours/me` (volunteer) — own total hours + shift history

**Notifications**
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

**Matching (AI feature)**
- `GET /api/match/role/:id` (admin)
- `GET /api/match/volunteer/me` (volunteer)

## 6. Security notes worth knowing for the viva

- Passwords are hashed with **bcrypt** before storage (never stored plain).
- Auth uses **JWT**: token carries `id` + `role`, verified by `middleware/auth.js`
  on every protected route; `authorize(...roles)` enforces role-based access.
- `POST /api/auth/register` currently accepts a `role` field from the client.
  That's fine for a student demo but is a real vulnerability (anyone can
  register as admin) — the fix is to drop `role` from the public register
  payload and create admin accounts only via the seed script or a separate
  protected endpoint. Good to flag proactively if asked about security.
- Mongoose schema validation (`required`, `enum`, `unique`) is the main input
  validation layer; add `express-validator` if you want more (e.g. email
  format checks) before the final submission.

## 7. What's deliberately left simple (call these out as "future work")

- Notifications are polled (`GET /api/notifications`), not real-time — add
  Socket.io later if you want live push updates.
- No file/image upload (e.g. profile photo, certificates) — add
  `multer` + local/S3 storage as a stretch goal.
- No rate limiting / helmet — fine for a college project, add
  `express-rate-limit` + `helmet` if a professor asks about production
  hardening.

These are good, low-effort "sustainable changes later" per your plan.
