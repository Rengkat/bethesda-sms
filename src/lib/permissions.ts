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
  | "attendance:manual-override"
  | "leave:approve"
  | "reports:export"
  | "settings:manage";

const FULL_ACCESS: StaffRole[] = ["SUPER_ADMIN", "HR_ADMIN"];
const DEPARTMENT_SCOPED: StaffRole[] = ["SUPERVISOR"];

const RULES: Record<Action, { full: StaffRole[]; scoped?: StaffRole[] }> = {
  "staff:view-all": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "staff:edit": { full: FULL_ACCESS },
  "attendance:manual-override": { full: FULL_ACCESS },
  "leave:approve": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "reports:export": { full: FULL_ACCESS, scoped: DEPARTMENT_SCOPED },
  "settings:manage": { full: ["SUPER_ADMIN"] },
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
