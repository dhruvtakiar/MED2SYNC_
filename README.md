# Med2Sync database layer

This standalone package defines the Med2Sync MongoDB collections, their Mongoose validation and indexes, and reusable workflow services. The supplied workspace did not contain the separately developed backend's routes/controllers/models, so this package does not claim route-level compatibility. Integrate its models and services into those controllers while keeping existing endpoint names and response shapes.

## Setup

1. Install Node.js 18+ and MongoDB. Transactions used during application approval require a replica set (a local single-node replica set is enough).
2. Copy `.env.example` to `.env`, set `MONGODB_URI` and a long random `JWT_SECRET`, then run `npm install`.
3. Run `npm test` for schema validation checks and `npm run seed` for development demo data.

Seed credentials are development-only: `admin@medvol.com` / `Admin@123` and `volunteer@medvol.com` / `Volunteer@123`. Never use them in production. `.env` is ignored by Git; do not commit secrets.

## Models and workflow

`src/models/index.js` exports `User`, `Volunteer`, `Skill`, `Event`, `Role`, `Application`, `ShiftAssignment`, `Attendance`, and `Notification`. Relations use ObjectId references; availability is embedded as a small value object. User passwords are bcrypt-hashed on save, excluded from normal selection and removed from JSON serialization. Registration handlers must explicitly set `role: 'volunteer'`; never accept a role from public registration input. Admin creation needs a trusted admin-only path. JWT issuance/verification belongs in the existing API auth layer and must use `JWT_SECRET`.

`src/services/workflow.js` provides application submission, transactional approval/rejection, shift assignment, check-in/out, volunteer-hours reporting, open-event lookup and admin verification. Controllers must enforce authentication and role authorization before calling admin operations; map service errors (`code`) to the API's established error response contract. Unique constraints protect one attendance record per assignment and one current application per volunteer/role. Reapplying after rejection/withdrawal reopens that record, so the collection stores the current application state rather than an application audit trail. Approval increments role capacity inside the same transaction as the status change.

The schema cannot enforce that a referenced document exists or that a volunteer owns a supplied profile id. Controllers/services should validate ownership, references and status transitions on every write. If a full application history is needed later, move the unique active-application constraint to a separate active-application/reservation design and retain immutable review records.

`src/services/matching.js` computes deterministic skill (70%) and availability (30%) scores and a plain-language explanation. It is recommendation data only; eligibility remains a backend decision. `getHoursReport` derives totals from attendance instead of storing a report collection.

## Backend wiring guide

Keep your current routes and response DTOs. Import the exported models/services into their existing controllers. Ensure admin-only checks on event/role CRUD, review, verification and assignment; ensure verified-volunteer checks and open-event checks for applications; return only open events to volunteer browsing. Add existing API-level JWT/auth behavior around these operations. For reports, call `getHoursReport({ volunteerId, from, to })`; derive the current volunteer id from the authenticated user for `/reports/hours/me`, never from request input.

### Basic API verification checklist

Exercise these against the existing API after integration, using its own route paths and response contract:

- Registration, login, profile retrieval/update, and confirm the serialized user never contains `password`.
- Admin-only event/role creation and unauthorized volunteer denial.
- Verified volunteer role application, duplicate active application rejection, and closed-event rejection.
- Admin approval/rejection; concurrent approvals at the final capacity slot; assignment denied for rejected applications.
- Overlapping shift rejection, one check-in/check-out per assignment, derived hours, and volunteer/admin hours reports.
- Notifications after application, review, verification and assignment; read-state filtering.
- Matching scores with a skill-only match (70) and both factors (100).

The repository supplied no running API or route definitions, so endpoint-level integration checks are a checklist for the backend owner rather than fabricated tests against nonexistent routes.
