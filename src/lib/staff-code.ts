import { prisma } from "@/lib/prisma";

/**
 * Generates the next staff code for a category: BHB-ST-#### for sighted
 * staff, BHB-VI-#### for visually impaired staff (mirrors
 * Staff.isVisuallyImpaired, which already existed — no new field needed).
 * Uses the highest existing number for that infix, not a plain count, so
 * it stays correct even if a staff record from the old BHB-#### scheme
 * or a gap in the sequence exists — a count-based approach would risk a
 * duplicate (staffCode is @unique) the moment any row doesn't fit the
 * assumed sequence.
 */
export async function generateStaffCode(isVisuallyImpaired: boolean): Promise<string> {
  const infix = isVisuallyImpaired ? "VI" : "ST";
  const prefix = `BHB-${infix}-`;

  const existing = await prisma.staff.findMany({
    where: { staffCode: { startsWith: prefix } },
    select: { staffCode: true },
  });

  const highest = existing.reduce((max, s) => {
    const suffix = s.staffCode.slice(prefix.length);
    const num = Number(suffix);
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);

  const next = highest + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
