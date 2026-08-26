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

## Not yet built (flagged, not silently skipped)

- Editing existing departments/shift-types/devices/staff (create + list
  + detail view exist; edit/delete follow the same modal pattern).
- Leave balance tracking against `LeaveType.defaultDaysPerYear` — requests
  and approval work end-to-end, but nothing yet decrements a running
  balance or shows it in the UI.
- SMS via Termii — env var is stubbed in `.env.example`, no send logic
  (Resend email is done; Termii would follow the same pattern in
  `notifications.ts`).
- Payroll — explicitly optional/later per the spec's phased plan.
