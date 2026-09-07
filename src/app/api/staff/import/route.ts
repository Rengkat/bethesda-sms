import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvToObjects } from "@/lib/csv";

const ROLES = new Set(["SUPER_ADMIN", "HR_ADMIN", "SUPERVISOR", "TEACHER", "HOUSE_PARENT", "SUPPORT_STAFF"]);
const CATEGORIES = new Set(["TEACHING", "NON_TEACHING"]);
const EMPLOYMENT_TYPES = new Set(["FULL_TIME", "PART_TIME", "VOLUNTEER"]);
const GENDERS = new Set(["MALE", "FEMALE"]);
const MARITAL_STATUSES = new Set(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]);

/**
 * Bulk create/update staff from a CSV matching /api/staff/template.
 * Upserts by staffCode: a code that already exists updates that staff
 * member (useful for correcting a batch of records), a new code creates
 * one. Deliberately excludes currentSalary — see the template route for
 * why salary never travels through a bulk CSV channel in this app.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Please choose a CSV file." }, { status: 422 });
  }

  const text = await file.text();
  const rows = parseCsvToObjects(text).filter((r) => r.staffCode && !r.staffCode.startsWith("#"));

  if (rows.length === 0) {
    return NextResponse.json({ message: "No valid rows found in that file." }, { status: 422 });
  }

  const departmentNames = [...new Set(rows.map((r) => r.departmentName?.trim()).filter(Boolean))];
  const departments = await prisma.department.findMany({ where: { name: { in: departmentNames } } });
  const departmentByName = new Map(departments.map((d) => [d.name, d.id]));

  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2;
    const roleValue = row.role?.trim().toUpperCase();
    const category = row.category?.trim().toUpperCase();
    const employmentType = row.employmentType?.trim().toUpperCase();
    const departmentId = departmentByName.get(row.departmentName?.trim());

    if (!row.fullName?.trim()) {
      errors.push(`Row ${lineNo}: missing fullName`);
      continue;
    }
    if (!departmentId) {
      errors.push(`Row ${lineNo}: no department found named "${row.departmentName}" — add it in Settings first`);
      continue;
    }
    if (!roleValue || !ROLES.has(roleValue)) {
      errors.push(`Row ${lineNo}: invalid role "${row.role}"`);
      continue;
    }
    if (!category || !CATEGORIES.has(category)) {
      errors.push(`Row ${lineNo}: invalid category "${row.category}"`);
      continue;
    }
    if (!employmentType || !EMPLOYMENT_TYPES.has(employmentType)) {
      errors.push(`Row ${lineNo}: invalid employmentType "${row.employmentType}"`);
      continue;
    }
    if (!row.dateHired || Number.isNaN(new Date(row.dateHired).getTime())) {
      errors.push(`Row ${lineNo}: invalid dateHired "${row.dateHired}" (use YYYY-MM-DD)`);
      continue;
    }
    const gender = row.gender?.trim().toUpperCase();
    if (gender && !GENDERS.has(gender)) {
      errors.push(`Row ${lineNo}: invalid gender "${row.gender}"`);
      continue;
    }
    const maritalStatus = row.maritalStatus?.trim().toUpperCase();
    if (maritalStatus && !MARITAL_STATUSES.has(maritalStatus)) {
      errors.push(`Row ${lineNo}: invalid maritalStatus "${row.maritalStatus}"`);
      continue;
    }

    const data = {
      fullName: row.fullName.trim(),
      email: row.email || null,
      phone: row.phone || null,
      departmentId,
      role: roleValue as never,
      category: category as never,
      employmentType: employmentType as never,
      dateHired: new Date(row.dateHired),
      dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
      gender: (gender || null) as never,
      maritalStatus: (maritalStatus || null) as never,
      nationality: row.nationality || null,
      stateOfOrigin: row.stateOfOrigin || null,
      homeAddress: row.homeAddress || null,
      nextOfKinName: row.nextOfKinName || null,
      nextOfKinPhone: row.nextOfKinPhone || null,
      nextOfKinRelationship: row.nextOfKinRelationship || null,
      bankName: row.bankName || null,
      bankAccountName: row.bankAccountName || null,
      bankAccountNumber: row.bankAccountNumber || null,
    };

    try {
      const result = await prisma.staff.upsert({
        where: { staffCode: row.staffCode.trim() },
        create: { staffCode: row.staffCode.trim(), ...data },
        update: data,
      });
      if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
      else updated++;
    } catch (err) {
      errors.push(`Row ${lineNo}: ${err instanceof Error ? err.message : "could not save this row"}`);
    }
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_BULK_IMPORTED",
    targetType: "Staff",
    targetId: "bulk",
    details: { created, updated, skipped: errors.length },
  });

  return NextResponse.json({ created, updated, skipped: errors.length, errors: errors.slice(0, 20) });
}
