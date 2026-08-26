import type { AttendanceStatus, AttendanceType } from "@/generated/prisma/client";

export type ShiftWindow = {
  startTime: string; // "07:30"
  endTime: string; // "15:30"
  gracePeriodMinutes: number;
};

/** Parse "HH:MM" into minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Classify a single check-in/check-out timestamp against its shift window.
 * Grace period only cushions check-ins; check-outs before shift end are
 * flagged as early departure with no grace applied.
 */
export function classifyAttendance(
  type: AttendanceType,
  timestamp: Date,
  shift: ShiftWindow,
): AttendanceStatus {
  const clockMinutes = minutesSinceMidnight(timestamp);
  const shiftStart = toMinutes(shift.startTime);
  const shiftEnd = toMinutes(shift.endTime);

  if (type === "CHECK_IN") {
    return clockMinutes > shiftStart + shift.gracePeriodMinutes
      ? "LATE"
      : "ON_TIME";
  }

  // CHECK_OUT
  return clockMinutes < shiftEnd ? "EARLY_DEPARTURE" : "ON_TIME";
}

/** How many minutes late/early — 0 if within the shift window. */
export function minutesDeviation(
  type: AttendanceType,
  timestamp: Date,
  shift: ShiftWindow,
): number {
  const clockMinutes = minutesSinceMidnight(timestamp);
  const shiftStart = toMinutes(shift.startTime);
  const shiftEnd = toMinutes(shift.endTime);

  if (type === "CHECK_IN") {
    return Math.max(0, clockMinutes - shiftStart - shift.gracePeriodMinutes);
  }
  return Math.max(0, shiftEnd - clockMinutes);
}

/** True if a staff member assigned to `shift` has no attendance logged for
 * a given day of week — used by the reporting module to flag absences. */
export function isScheduledOn(daysOfWeek: number[], date: Date): boolean {
  return daysOfWeek.includes(date.getDay());
}
