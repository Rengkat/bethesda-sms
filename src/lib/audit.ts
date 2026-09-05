import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type WriteAuditLogInput = {
  actorId: string;
  action: string; // e.g. "MANUAL_ATTENDANCE_OVERRIDE", "STAFF_EDITED"
  targetType: "Attendance" | "Staff" | "LeaveRequest" | "Device" | "Settings" | "Donation" | "Visitor" | "PayrollPeriod";
  targetId: string;
  details?: Prisma.InputJsonValue;
};

/**
 * Every manual attendance edit, staff record change, and leave decision
 * must call this. Call it in the same request as the mutation it records —
 * do not batch or defer audit writes.
 */
export async function writeAuditLog(input: WriteAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details,
    },
  });
}
