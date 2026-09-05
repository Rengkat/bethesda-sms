import type { StaffRole } from "@/generated/prisma/client";

/**
 * Central permission table — mirrors the Roles & Permission Matrix in the
 * system spec. Keep every access decision routed through these helpers
 * rather than scattering role checks across pages/components, so the
 * matrix stays the single source of truth.
 */

export type Action =
  | "staff:view-all"
  | "staff:edit"
  | "staff:view-salary"
  | "staff:edit-salary"
  | "attendance:manual-override"
  | "leave:approve"
  | "reports:export"
  | "settings:manage"
  | "donations:manage"
  | "visitors:void"
  | "staff:issue-query"
  | "staff:resolve-query"
  | "payroll:manage";

const FULL_ACCESS: StaffRole[] = ["SUPER_ADMIN", "HR_ADMIN"];
const DEPARTMENT_SCOPED: StaffRole[] = ["SUPERVISOR"];

const RULES: Record<Action, { full: StaffRole[]; scoped?: StaffRole[] }> = {
  "staff:view-all": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "staff:edit": { full: FULL_ACCESS },
  // Salary is the most sensitive field on the Staff record — intentionally
  // NOT department-scoped, so a Supervisor can see everything else about
  // their team but never pay figures. Only SUPER_ADMIN/HR_ADMIN.
  "staff:view-salary": { full: FULL_ACCESS },
  "staff:edit-salary": { full: FULL_ACCESS },
  "attendance:manual-override": { full: FULL_ACCESS },
  "leave:approve": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "reports:export": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "settings:manage": { full: ["SUPER_ADMIN"] },
  // Donation records carry financial detail (donor contact, amounts) so
  // they're kept to the same trust tier as salary/settings, not opened up
  // to Supervisors the way staff:view-all is.
  "donations:manage": { full: FULL_ACCESS },
  // Editing a visitor entry stays as open as logging one (any signed-in
  // staff can fix a front-desk typo — see src/app/api/visitors/route.ts).
  // Voiding is different: it removes an entry from the official on-site
  // count, so — unlike edit — it's restricted, with no department scope
  // to fall back on since a visitor isn't tied to one.
  "visitors:void": { full: FULL_ACCESS },
  // A Supervisor can issue a query to someone on their own team (that's
  // ordinary line-management), but deciding the outcome — including
  // attaching a pay deduction — is kept to HR/Super Admin only, same
  // trust tier as salary itself.
  "staff:issue-query": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "staff:resolve-query": { full: FULL_ACCESS },
  "payroll:manage": { full: FULL_ACCESS },
};

/** True if the role has unrestricted (org-wide) access for this action. */
export function can(role: StaffRole, action: Action): boolean {
  return RULES[action].full.includes(role);
}

/** True if the role has department-scoped access for this action. */
export function canWithinDepartment(role: StaffRole, action: Action): boolean {
  return can(role, action) || (RULES[action].scoped?.includes(role) ?? false);
}

/**
 * Self-service roles (Teacher / House Parent / Support Staff) can always
 * view their own attendance and leave records, regardless of the table
 * above — this is intentionally unconditional.
 */
export function canViewOwnRecords(_role: StaffRole): boolean {
  return true;
}

export function isSupervisorOf(
  role: StaffRole,
  departmentId: string,
  staffDepartmentId: string,
): boolean {
  if (can(role, "staff:view-all")) return true;
  return role === "SUPERVISOR" && departmentId === staffDepartmentId;
}
