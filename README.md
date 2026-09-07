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

## This pass: UI/UX fixes, staff editing, exports, ad-hoc deductions

- **Design system**: `Button` rebuilt with solid fills, shadows, and
  hover/active states instead of flat/borderless — plus a global CSS rule
  (`button:not(:disabled) { cursor: pointer }`) since neither Chrome nor
  Firefox gives `<button>` a pointer cursor by default the way `<a>` gets
  one, which was the actual cause of buttons "not looking clickable".
- **Modal fix** — this was the root cause of multiple reported bugs at
  once: a fixed `max-w-md` with no internal scroll meant any form with
  more than a few fields (Visitor, Donation, Issue Query) overflowed
  past the top of the viewport with no way to scroll up to it. Modal now
  supports a `size` prop (`md`/`lg`/`xl`), scrolls internally, and keeps
  its header visible while the body scrolls.
- **Squeezed-left pages** — Add Staff, Manual Entry, Sign In/Out, Profile,
  and Leave Detail had a `max-w-*` with no `mx-auto`, so they sat flush
  left with dead space on the right on wide screens. All five fixed.
- **Duplicate "Super Admin" in the topbar** — not a code bug: the
  account's `name` field was literally set to "Super Admin" (likely typed
  as the third argument to `create-admin.ts`). Added a self-service name
  editor on `/profile` (via Better Auth's `updateUser`) and hardened the
  bootstrap script to reject role-like names going forward.
- **Staff editing** (`/staff/[id]/edit`) — full edit form (same fields as
  create) via a new `PATCH /api/staff/[id]`, plus **document upload**:
  real file upload (PDF/JPG/PNG/WEBP, 10MB cap) to local disk under
  `public/uploads/staff-documents/`. **Read the caveat**: this only
  persists on a server with a real filesystem (VPS/Docker) — on
  serverless hosting (Vercel etc.) uploaded files vanish on redeploy.
  Swap the write in `api/staff/[id]/documents/route.ts` for an
  S3/R2/Cloudinary upload if you deploy there; `StaffDocument.fileUrl` is
  just a URL string either way, so nothing else changes.
- **Staff detail page redesign** — hero header (avatar/initials, key
  facts, status badges), Edit button, and the discipline section now
  shows both `StaffQuery` deductions and ad-hoc `StaffDeduction`s
  together with a running "pending deduction" badge in the header.
- **Ad-hoc salary deductions** (`StaffDeduction` model) — the "any other
  reason" case from the original ask: an advance repayment, damaged
  equipment, etc., not tied to a formal query. Claimed by payroll
  generation exactly like query deductions (folded into the existing
  `Payslip.otherDeductions`/`otherDeductionNote`), so it can't be
  double-counted across two runs. Gated to Super Admin/HR Admin
  (`staff:issue-deduction`) — same trust tier as salary.
- **Per-staff attendance export** — a date-range CSV/PDF export button on
  the staff detail page's attendance card. Exporting your own record
  needs no special permission; exporting someone else's needs
  `reports:export`.
- **Reports page date range** — `/api/reports/export` now accepts
  `from`/`to`, with date pickers on the Attendance Summary and Lateness
  Pattern cards. A specified range is unbounded (previously capped at
  1000 rows); an unbounded request still gets that 1000-row safety cap.
- **Visitors/Donations CSV import + export** — both pages now have
  Import (with a downloadable template, `/api/{visitors,donations}
  /template`) and date-range Export buttons. Donation import resolves
  `receivedByStaffCode` against `Staff.staffCode` — rows with no matching
  code are rejected with a line-numbered error, not silently dropped or
  guessed. No CSV library was added; `src/lib/csv.ts` is a small
  hand-rolled parser (quoted fields, embedded commas, escaped quotes) —
  sufficient for this app's flat row shapes, not a full RFC 4180 impl
  (no multi-line quoted fields).
- **Payroll page walkthrough** — an explanatory 4-step card ("set a
  salary → resolve queries/deductions → generate → finalize/pay") added
  above the period list, since the mechanics weren't self-evident from
  the UI alone.

`npx eslint src` is clean. `npx tsc --noEmit` has no errors beyond the
same category as every prior pass: `Cannot find module
'@/generated/prisma/client'` (resolved by `npx prisma generate`, which
this sandbox can't reach — see the earlier note) and the
`staff-filters.tsx` gap flagged two passes ago, still unresolved because
`store/staff-filters-store.ts` hasn't been shared.

## Correction: Donation no longer relates to Staff at all

Earlier passes had `Donation.receivedBy` as a required relation to
`Staff` (whoever logged the donation on the org's behalf). That was
flagged as wrong: a donation comes from a donor to the organisation, and
modeling it with a hard Staff foreign key implied a relationship that
doesn't exist. Fixed:

- `Donation.receivedBy`/`receivedById` (a `Staff` relation) is **removed
  entirely** — no field on `Donation` references `Staff` anymore.
- Replaced with `recordedBy String` — just the actorId of whichever
  signed-in user typed the entry in, exactly the same pattern already
  used by `Visitor.registeredBy`. It's an audit-trail detail (who logged
  it), not a relation, and not shown in the UI — same as how
  `Visitor.registeredBy` was never surfaced in the visitors table either.
- Removed the "Received by" staff picker from both the donation
  register and edit forms, the "Received by" column from the donations
  table, and the `receivedByStaffCode` column from the CSV
  template/import/export.
- The Donations page no longer fetches the staff list at all — it had
  no other reason to.

This is a schema change (`Donation.receivedById` dropped,
`Donation.recordedBy` added) — run:
```bash
npx prisma generate
npx prisma migrate dev --name donation_no_staff_relation
```
If you already have donation rows in a database from before this fix,
this migration will need a manual backfill step (drop the old FK column,
add `recordedBy` with a default/backfilled actorId) since Prisma can't
infer what actorId to put there for existing rows — happy to write that
migration SQL if you tell me whether you have existing donation data to
preserve.

## This pass: bulk import/export everywhere, payroll clarity, two real bugs fixed

**1. Fingerprint templates — decision: don't store them, and here's why.**
Checked `sync-bridge/sync.js`: it only ever calls `zk.getAttendances()` —
timestamped check-in/out events keyed by the device's numeric user ID.
It never calls anything that would pull a raw fingerprint template off
the device. That's correct, not a gap:
- The ZKTeco K40 enrolls and matches fingerprints **entirely on-device**.
  That's the whole point of the hardware — the app was never going to
  receive template data through this integration.
- Under Nigeria's Data Protection Act (NDPR), biometric data is
  classified as *sensitive personal data* with extra obligations
  (explicit consent, security assessments) this app doesn't currently
  implement — copying templates into a general-purpose Postgres DB would
  create a compliance burden with no functional upside.
- `Staff.staffCode` (already unique, already mapped to the device's user
  ID — see the schema comment) is the only linkage the app actually
  needs to attribute a scan to a person. If a device is ever replaced,
  re-enrollment happens on the new device regardless of what's in this
  database, so centralizing templates wouldn't even save that step.

**2. Staff CSV import/export** (`/staff` → Import CSV / Export CSV) —
upserts by `staffCode` (existing code updates that person, new code
creates one), matches department by name against `Settings → Departments`
(doesn't create departments from typos), full personal/next-of-kin/bank
fields. **Salary is deliberately excluded from both** — bulk CSV is a bad
channel for the single most sensitive field on a staff record (files get
emailed, forwarded, left in Downloads); it's set one person at a time on
the Edit Staff page, same as before.

**3. Attendance CSV import** (`/attendance` → Import CSV) — for backfilling
after a device outage: `staffCode`, `deviceName`, `timestamp`, `type` per
row, matched against the actual device that was down. Every imported row
becomes a `MANUAL_OVERRIDE`/`MANUAL` record, same as a single manual
entry, and the whole batch shares one required reason (same accountability
requirement as the existing single-entry form). **Export already existed**
on the Reports page (date range → CSV/PDF); added a direct "Export"
button on the Attendance page itself too, pointing at the same endpoint,
so you don't have to leave the page to get it.

**4. Two real bugs fixed:**
- **Sign out did nothing.** `authClient.signOut()` was called with no
  follow-up — it cleared the session cookie but never navigated anywhere,
  so the sidebar/topbar kept showing you as signed in until you manually
  reloaded. Fixed with a shared `useSignOut()` hook that hard-redirects to
  `/login` after sign-out completes (a full reload here is deliberate —
  it guarantees stale client state doesn't linger).
- **Topbar role text** was rendering the raw enum (`SUPER_ADMIN`) instead
  of formatted text — fixed. Separately: if the topbar still shows a
  role-shaped name after using the `/profile` name editor from the last
  pass, there's now a guaranteed CLI fallback that bypasses the UI
  entirely: `npx tsx scripts/set-user-name.ts admin@example.com "Real
  Name"`. Tell me if the in-app editor itself errors — I can't reproduce
  that from here without a live database to test against.

**5. Leave export** (`/leave` → Export) — CSV, date range on `startDate`,
same open-to-any-signed-in-user access as the leave page itself.

**6 & 7. Visitors and Donations now have a page-level date filter**, not
just an export — a plain `?from=&to=` GET form above each table
(`DateRangeFilterForm`) that actually changes what's displayed, separate
from the CSV export button that downloads a file. Both existed as
export-only after the previous pass; this adds the "show me only this
range" half.

**8. Payroll deductions were never lateness-only** — that logic was
already correct (any resolved `StaffQuery`, regardless of category —
misconduct, policy violation, performance, anything — gets claimed by
payroll if HR attached a deduction amount when resolving it), but nothing
on screen said so. Fixed the actual gap, which was **visibility**: added
`Payslip.queryDeductionNote` (e.g. "MISCONDUCT: Left post unattended —
14 March") so a payslip shows *why* a deduction happened, not just a lump
number — same treatment `otherDeductionNote` already got for ad-hoc
deductions. Rewrote the payroll walkthrough and the generate-payroll
modal copy to say this explicitly instead of leaving it to be inferred
from two rate inputs that are only about lateness/absence.

This is a schema change (`Payslip.queryDeductionNote` added) — run:
```bash
npx prisma generate
npx prisma migrate dev --name payslip_query_deduction_note
```

`npx eslint src` is clean. `npx tsc --noEmit` has no errors beyond the
same recurring category: `Cannot find module
'@/generated/prisma/client'`, resolved by `npx prisma generate` (this
sandbox can't reach `binaries.prisma.sh` to run it — see the earlier
note), plus the still-unresolved `staff-filters.tsx` gap from several
passes ago (needs `store/staff-filters-store.ts`, never shared).

## This pass: crash fix, auto staff codes, visitor↔donation linking, pagination, payroll simplification, Excel export, layout fixes

**Urgent fix — Decimal serialization crash.** `Staff.currentSalary` and
`Donation.amount` are Prisma `Decimal` instances, which Next.js can't
send from a Server Component to a `"use client"` component as a prop
(fails at runtime, not compile time). Fixed everywhere it was happening
(`/shifts`, `/attendance/manual-entry`, `/staff/[id]/edit`, the donations
table/edit button) — either by selecting only the plain fields a
component actually needs, or via new `serializeStaffForClient()`/
`serializeDonationForClient()` helpers in `src/lib/serialize.ts`. Also
caught the same bug one level deeper while building the visitor detail
page below (a visitor's linked `donations` array carries Decimal
`amount` fields too) — stripped before crossing into `VisitorEditButton`.
**If you add another Decimal field to the schema later, this class of
bug can resurface anywhere that record crosses into a client
component — worth remembering, not just this specific fix.**

**Staff codes are now generated by the platform** — `BHB-ST-####` for
sighted staff, `BHB-VI-####` for visually impaired (derived from the
existing `isVisuallyImpaired` field, no new column needed). Uses the
highest existing number for that prefix, not a plain count, so it stays
correct even with gaps; retries once on a collision. The Add Staff form
no longer asks for a code; Edit Staff still allows correcting one
manually (for legacy data).

**Visitors and Donations are now properly linked**, per the correction
that most visitors here are donors, not general foot traffic:
- `Donation.visitorId` (optional) — set when a donation happens during a
  logged visit. The Register Visitor form has an inline "This visitor is
  also making a donation" section; checking it creates the Visitor and a
  linked Donation in one transaction. That donation is one row, referenced
  from both places — it shows up on the regular Donations page exactly
  like any other, and also on the visitor's own page.
- **New: Visitor detail page** (`/visitors/[id]`) — visit details, total
  given (gated behind `donations:manage`, same as the Donations page
  itself), and every donation linked to that visitor, with a "Record a
  donation" button for adding one after the fact if it wasn't captured at
  sign-in. Recording a donation this way is **not** gated behind
  `donations:manage` — same reasoning as the inline case: capturing a
  donation at the point of contact is a front-desk action; viewing the
  aggregate list, editing, and voiding remain restricted.
- The Donations table now shows a "From a visit" link back to the
  visitor's page when a row has one.

**Pagination** — added to every list page (Staff, Attendance, Visitors,
Donations, Leave, Payroll) via a shared `PaginationControls` component,
plain `?page=N` links (no client JS). The date-filtered pages (Visitors,
Donations) correctly preserve `from`/`to` across page links.

**Payroll simplified** — removed the rate-based lateness/absence
auto-deduction entirely (`lateDeductionPerOccurrence`/
`absenceDeductionPerOccurrence`/`attendanceDeduction` all dropped from
the schema). Late/absent counts are still computed and shown on each
payslip, but purely as context — they no longer affect `netPay`. If a
late or absent day should cost someone pay, that's now always an
explicit HR decision (issue a query or an ad-hoc deduction on the staff
profile), never a blanket rate applied at generation time. The "how
payroll works" walkthrough now only shows when there are zero periods
yet, instead of permanently taking up space once you're a regular user.

**Payroll Excel export** — `/api/payroll/[id]/export`, a real `.xlsx`
(via the new `xlsx` dependency), with staff code, name, bank details,
each deduction line with its note, and net pay — ready for a bank
upload/finance handoff, not just CSV.

**Layout fixes:**
- Donation form labels now have explicit `text-left` (I couldn't find an
  actual centering rule anywhere in the codebase to point to as the
  cause — if this persists, I'll need a screenshot to dig further).
- The real cause of buttons wrapping onto their own line: `PageHeader`'s
  own actions wrapper had no `flex-wrap` and switched to a side-by-side
  layout at a too-narrow `sm:` (640px) breakpoint, so title + several
  buttons fought for room. Fixed at the source (`PageHeader` now wraps
  properly and stacks until `lg:`), and removed the redundant nested
  wrapper divs on Donations/Visitors/Staff/Leave/Attendance that were
  fighting with it.

This is a schema change (`Donation.visitorId`, `Visitor.donations`
relation, `PayrollPeriod`/`Payslip` fields dropped) — run:
```bash
npm install
npx prisma generate
npx prisma migrate dev --name visitor_donation_link_and_payroll_simplify
```

`npx eslint src` is clean. `npx tsc --noEmit` has no errors beyond the
same recurring category (`Cannot find module
'@/generated/prisma/client'`, resolved by `npx prisma generate`) plus
the still-unresolved `staff-filters.tsx` gap from several passes ago.

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
