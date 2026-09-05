# Bethesda Home & School for the Blind — Staff Management System

Full-stack staff management app: records, biometric attendance, shifts,
leave, and reporting. Built to match the brand of
bethesdahomefortheblind.com — royal-blue primary (`--color-brand-blue`),
near-black navy sidebar/footer (`--color-brand-navy`), lavender accent
sections (`--color-brand-lavender`).

## Stack

- **Next.js 16.3** (App Router, full-stack, TypeScript)
- **PostgreSQL + Prisma 7**
- **Better Auth** (session-based email/password login)
- **Zustand** for client-side UI state (sidebar/drawer, table filters)
- **Tailwind CSS v4** + hand-rolled accessible primitives (no opaque
  component-library markup, so screen readers get plain semantic HTML)
- **ZKTeco K40 + Raspberry Pi** sync bridge (`sync-bridge/`)

## One deliberate deviation from the original spec: auth library

The spec called for **Lucia Auth**. Lucia was deprecated by its maintainer
in 2025 — no v4 was ever published, and the npm package is flagged
deprecated with no active security patching. Building a new app on it today
means inheriting a codebase no one is fixing. **Better Auth** is the
actively maintained, Prisma-native successor most current guides point to,
so the schema (`prisma/schema.prisma`) and `src/lib/auth.ts` target it
instead. The `User`/`Session` shape is close enough to Lucia's that this
isn't a structural rewrite if you ever need to switch again.

## Getting started

```bash
npm install

cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET, DEVICE_SYNC_SECRET

npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed        # departments, shift types, leave types

npm run dev
```

**Note on this sandbox:** `prisma generate` could not run inside the tool
environment this project was built in — it needs `binaries.prisma.sh`,
which isn't on that environment's network allowlist, so the generated
client at `src/generated/prisma/` doesn't exist here yet. Everything else
has been type-checked and linted clean (`npx tsc --noEmit`, `npx eslint`);
the only errors were "module not found" for that not-yet-generated path.
Run `npx prisma generate` on your own machine and those resolve
immediately.

### Prisma 7: config lives in two places

Prisma 7 removed `datasource.url` from `schema.prisma` and requires a
driver adapter — there's no more built-in query engine. Two consequences,
already wired up in this project:

- **`prisma.config.ts`** (project root) — read by the CLI (`generate`,
  `migrate`, `db seed`). Loads `DATABASE_URL` via `dotenv/config` since
  Prisma 7's CLI no longer auto-loads `.env`.
- **`src/lib/prisma.ts`** — read by the running app. Builds a
  `@prisma/adapter-pg` adapter from `DATABASE_URL` and passes it into
  `new PrismaClient({ adapter })`.

Both read the same `DATABASE_URL` — just keep it in `.env` and you never
touch either file. The generated client lands at `src/generated/prisma/`
(not `node_modules/@prisma/client` — that's also new in v7), which is why
every model-type import in this project is
`from "@/generated/prisma/client"` rather than `from "@prisma/client"`.

### Creating the first Super Admin

There's no public sign-up route by design (`disableSignUp: true` in
`src/lib/auth.ts` — HR/Super Admin creates accounts, staff don't
self-register). Create the first account with Better Auth's server API,
e.g. in a one-off script or `npx tsx` REPL:

```ts
import { auth } from "@/lib/auth";
await auth.api.signUpEmail({
  body: { email: "admin@bethesdahomefortheblind.com", password: "…", name: "…" },
});
// then set role: "SUPER_ADMIN" on the created User row directly via Prisma
```

### Sync bridge (Raspberry Pi)

```bash
cd sync-bridge
npm install
cp .env.example .env   # DEVICE_IP, DEVICE_ID (from the Device table), DEVICE_SYNC_SECRET
npm run pm2            # keeps it running across reboots
```

It polls the K40 every 5 minutes, POSTs new logs to
`/api/attendance/sync`, and queues unsent logs to a local JSON file if the
app is unreachable — it never assumes constant site internet.

## Structure

```
src/
├── app/
│   ├── (auth)/login/            # public login page
│   ├── (dashboard)/             # role-gated shell — layout.tsx checks session
│   │   ├── dashboard/           # overview / stat cards
│   │   ├── staff/               # list, [id] profile, new
│   │   ├── attendance/          # daily view, manual-entry
│   │   ├── shifts/              # shift type templates + assignments
│   │   ├── leave/                # requests queue, [id] approve/reject
│   │   ├── reports/              # CSV export (PDF: add alongside it later)
│   │   ├── settings/             # departments, shift-types, devices
│   │   └── profile/
│   └── api/
│       ├── auth/[...all]/        # Better Auth handler
│       ├── attendance/sync/      # Pi bridge → app (shared-secret auth)
│       ├── attendance/manual-entry/
│       ├── staff/                # create + list
│       ├── leave/[id]/           # approve/reject
│       └── reports/export/       # CSV
├── components/
│   ├── layout/                   # Sidebar, MobileNav (focus-trapped drawer), Topbar
│   ├── ui/                       # Button, Badge, Card
│   ├── staff/ attendance/ leave/ shifts/ reports/ shared/
├── lib/
│   ├── prisma.ts  auth.ts  auth-client.ts
│   ├── permissions.ts            # role → action matrix, mirrors the spec's table
│   ├── attendance-rules.ts       # lateness/absence classification
│   └── audit.ts                  # writeAuditLog() — call on every override
├── store/                        # Zustand: ui-store (nav), staff-filters-store
├── hooks/use-focus-trap.ts       # keyboard trap for the mobile drawer/modals
prisma/schema.prisma
prisma/seed.ts
sync-bridge/                      # separate deployable — runs on the Pi
```

## Accessibility (non-negotiable, per the spec)

- Every layout has a **skip-to-content** link, semantic landmarks
  (`<nav aria-label>`, `<main id="main-content">`), and a global
  high-contrast `:focus-visible` ring — no interactive element relies on
  color alone or hides its focus outline.
- The mobile nav is a real modal: `role="dialog"`, `aria-modal`, focus
  trapped inside it, closes on Escape, and returns focus to the trigger
  button on close (`src/hooks/use-focus-trap.ts`).
- Nav items always show a text label next to the icon — never icon-only —
  since supervisors/admins using this may themselves be visually impaired.
- Tables use `<caption class="sr-only">`, `<th scope="col">`, and real
  `<Link>`s for row navigation (not `onClick` on a `<div>`).
- `prefers-reduced-motion` is respected globally in `globals.css`.
- Still to do before go-live, per the spec's phased plan: a full pass with
  NVDA/VoiceOver across every page, and the optional TTS "Attendance
  recorded for [Name]" confirmation via an on-site speaker.

## Roles & permissions

`src/lib/permissions.ts` is the single source of truth for the matrix in
the spec (`can()` / `canWithinDepartment()`). Every API route checks it
server-side — client-side role checks (e.g. hiding the "Settings" nav
item) are a UX convenience, not the security boundary.

## Since the first pass

- **Department / shift-type / device create forms** are wired up as
  accessible modals (`src/components/ui/modal.tsx` — same focus-trap
  pattern as the mobile nav) backed by `src/app/api/settings/*`, all
  gated on `settings:manage` and audit-logged.
- **Shift assignment** — "Assign staff" on each shift-type card
  (`src/components/shifts/assign-staff-button.tsx` →
  `POST /api/shifts/assignments`) with a day-of-week picker.
- **Self-service leave requests** — "New request" on the Leave page
  (`leave-request-create-button.tsx` → `POST /api/leave`), resolved
  against the signed-in user's linked `Staff` record.
- **Notifications** (`src/lib/notifications.ts`, Resend) — late check-in
  alerts to the department supervisor, leave-submitted alerts to the
  approver, leave-decision emails to the requester. Every send function
  no-ops with a console warning when `RESEND_API_KEY` is unset, so the
  app keeps working before notifications are configured.
- **PDF export** — `GET /api/reports/export?format=pdf` alongside the
  existing CSV, via `pdfkit` (`src/lib/pdf-report.ts`); a plain
  letterhead table, deliberately unstyled for printability.

`npx tsc --noEmit` and `npx eslint src` are both clean after these
additions (checked the same way as the first pass — see the Prisma note
above for the one category of error that only resolves outside this
sandbox).

## This pass: staff detail, visitors, donations, self-service attendance, dashboard

- **Staff record expanded** — category (Teaching/Non-teaching), full
  personal detail (DOB, gender, marital status, nationality, state of
  origin, home address), next of kin, bank details, and a monthly
  `currentSalary` field. Salary is gated behind two new permission
  actions, `staff:view-salary` / `staff:edit-salary` (Super Admin/HR
  Admin only, deliberately **not** department-scoped like most of the
  Staff record — a Supervisor sees everything else about their team but
  never pay figures). The API strips salary server-side for any caller
  without the edit permission, regardless of what the request body says.
- **Qualifications** (`Qualification` model) — WAEC/SSCE, NCE, degrees,
  professional certs, each optionally linked to a scanned certificate
  via `StaffDocument`. `StaffDocument.type` categorizes uploads
  (ID card / contract / qualification certificate / exam result /
  medical report), shown on the staff profile with expiry warnings.
- **Visitors** (`Visitor` model, `/visitors`) — the front-desk sign-in
  book, digitised: name, organization, category, purpose, who they're
  seeing, time in/out. Deliberately **not** role-gated — any signed-in
  staff member may be on front-desk duty — but every entry is attributed
  to `registeredBy` (the logged-in user's id).
- **Donations** (`Donation` model, `/donations`) — cash, bank transfer,
  cheque, or in-kind, with donor type/contact, purpose/designation, and
  who received it. Gated behind `donations:manage` (Super Admin/HR Admin
  only) since it carries donor contact detail and amounts — unlike
  Visitors, this is finance-adjacent, not a general front-desk task. This
  is a **record book, not a payment processor** — see `.env.example` for
  how an online-giving integration would plug in later without changing
  this model.
- **Self-service attendance** (`/attendance/sign`) — for staff whose post
  isn't near the ZKTeco unit (kitchen, grounds, security), a one-button
  sign-in/out that infers which action to take from what's already
  logged today, classified through the same `attendance-rules.ts` used
  for biometric check-ins. Recorded with `AttendanceSource.WEB_SELF` so
  it's visually distinct from biometric/manual entries everywhere
  attendance is listed.
- **Dashboard overview** (`/dashboard`) — real queries, not placeholders:
  active/teaching staff counts, checked-in-today, pending leave, late
  count, visitors on site, a 7-day attendance trend chart, a staff-by-
  department breakdown, and (Super Admin/HR Admin only) a 6-month
  donations trend — all via `recharts`, which was already a dependency.

`npx tsc --noEmit` and `npx eslint src` are clean for every file touched
in this pass (see the Prisma note above for the one category of error —
missing generated-client types — that only resolves once you run
`npx prisma generate` outside this sandbox).

**Known gap carried over from the previous pass:** `staff-filters.tsx`
now references a `category` filter that `store/staff-filters-store.ts`
needs a matching `category`/`setCategory` field added to — that store
file wasn't shared, so it couldn't be updated here.

## This pass: edit/void for Visitors & Donations, discipline queries, payroll

- **Visitor/Donation edit + void** — both were create-and-list-only
  before. Editing is a full form PATCH (blocked once an entry is voided).
  Voiding is **not deletion** — it sets `voided`/`voidedAt`/`voidedBy`/
  `voidReason` and keeps the row, because a sign-in book and a financial
  log both need a trail of who removed an entry and why, not a silent
  disappearance. Voided rows are excluded from dashboard/stat-card counts
  (`voided: false` added to those queries) but still show in the table,
  grayed out with the reason. Editing a Visitor stays as open as creating
  one (any signed-in staff can fix a typo); voiding is gated to
  `visitors:void` (Super Admin/HR Admin) since it affects the official
  count. Donation edit/void both stay behind `donations:manage`, same as
  before.
- **Discipline / queries** (`StaffQuery` model) — a formal write-up, in
  the common HR sense: category (lateness/absenteeism/misconduct/policy/
  performance/other), subject, description, optional response deadline.
  A Supervisor can issue one to someone in their own department (checked
  by an explicit staffId→departmentId lookup in
  `api/staff/[id]/queries/route.ts` — **not** via
  `permissions.ts#isSupervisorOf`, which hardcodes its full-access check
  to `staff:view-all` and isn't a generic same-department test; worth
  knowing if you extend that helper later). The staff member responds
  from `/profile` (`staff:id` on the query must match their own). Only
  Super Admin/HR Admin can resolve a query (`staff:resolve-query`) —
  **that's the only place a salary deduction gets attached**, deliberately
  decoupled from who issued it.
- **Payroll** (`PayrollPeriod` + `Payslip`, `/payroll`, Super Admin/HR
  Admin only) — generating a period snapshots every active staff member's
  `currentSalary` into a Payslip and computes:
  - **Attendance deduction** — `lateCount × lateDeductionPerOccurrence +
    absenceCount × absenceDeductionPerOccurrence`, both rates set per-run
    (not global) so a past period's figures don't shift if policy changes
    later. Absence = a day the staff had an active `ShiftAssignment`
    covering it but no `CHECK_IN` at all that day; a day with no shift
    assignment is never counted as an absence.
  - **Query deductions** — every `RESOLVED` `StaffQuery.deductionAmount`
    not yet claimed by an earlier payslip (`payslipId IS NULL`) is summed
    in and then claimed (`payslipId` set) inside the same transaction, so
    the same disciplinary deduction can never be double-counted across
    two payroll runs.
  - `netPay = max(0, baseSalary − attendanceDeduction − queryDeductions)`.
  A period is `DRAFT → FINALIZED → PAID`; only a `DRAFT` can be
  finalized, only `FINALIZED` can be marked paid — no going backwards.
  **This computes what should be paid; it does not move money.** There's
  no bank transfer or payment API integration — HR actions payment
  manually using the bank details already on each Staff record, then
  marks the period paid.
- Staff's own payslip history and query history now show on `/profile`.

`npx tsc --noEmit` and `npx eslint src` are clean for every file in this
pass too — the only remaining `tsc` errors are `Cannot find module
'@/generated/prisma/client'`, because `src/generated/prisma/` is
regenerated by `npx prisma generate` (gitignored, and this sandbox
couldn't reach `binaries.prisma.sh` to run it — see the earlier note).

## This pass: forgot password via email OTP

- Uses Better Auth's built-in `emailOTP` plugin (`better-auth/plugins`)
  rather than a hand-rolled token table — it already had a
  `forget-password` OTP flow with rate limiting, attempt limits, and
  hashed storage built in, so there was no reason to reimplement one
  against the `Verification` model by hand.
- Flow: `/forgot-password` → enter email → `authClient.emailOtp
  .requestPasswordReset({ email })` → 6-digit code emailed via
  `sendPasswordResetOTP` in `notifications.ts` (same Resend setup as
  every other email in this app) → enter code + new password on the same
  page → `authClient.emailOtp.resetPassword({ email, otp, password })` →
  redirect to `/login?reset=success`.
- Config in `src/lib/auth.ts`: 6-digit code, 5-minute expiry, 3 allowed
  attempts, OTP hashed at rest (`storeOTP: "hashed"` — doesn't change
  what's emailed, only what's persisted).
- **Doesn't reveal whether an email has an account** — the request step
  shows the same "if that email has an account…" message either way, to
  avoid using this form to enumerate valid staff emails.
- **If `RESEND_API_KEY` isn't set**, the OTP has nowhere to go. In
  development it's logged to the console so the flow stays testable; in
  production it's never logged (server logs are typically less
  access-controlled than email), so an admin genuinely couldn't recover
  their account. See the updated `.env.example` — set this before
  go-live, not after someone's actually locked out.

## Not yet built (flagged, not silently skipped)

- Editing existing departments/shift-types/devices (create + list +
  detail view exist; edit/delete follow the same modal pattern). Staff,
  Visitor, and Donation edit now exist as of this pass.
- Leave balance tracking against `LeaveType.defaultDaysPerYear` — requests
  and approval work end-to-end, but nothing yet decrements a running
  balance or shows it in the UI.
- SMS via Termii — env var is stubbed in `.env.example`, no send logic
  (Resend email is done; Termii would follow the same pattern in
  `notifications.ts`).
- Online giving (Paystack/Flutterwave) — Donations is a manual record
  book by design; see `.env.example` for how a webhook-based integration
  would slot in later without changing the `Donation` model.
- Actual payment execution for payroll — `Payslip`/`PayrollPeriod` compute
  what should be paid and track DRAFT/FINALIZED/PAID status; there's no
  bank transfer or payment API call anywhere, by design (see the payroll
  section above).
- A printable payslip or donation-receipt PDF — both are captured as data
  (`Donation.receiptNumber`, `Payslip.netPay` etc.) but nothing generates
  the printable document yet; would follow the same `pdfkit` pattern as
  `src/lib/pdf-report.ts`.
- Query issuance notification — a `StaffQuery` shows up on `/profile`
  next time the staff member loads it, but nothing emails/SMSs them that
  a new one exists (would reuse `notifications.ts`, same as leave
  decisions).
