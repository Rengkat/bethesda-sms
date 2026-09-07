import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsvRow } from "@/lib/csv";

const HEADER = [
  "staffCode", "fullName", "email", "phone", "departmentName", "role", "category", "employmentType",
  "dateHired", "dateOfBirth", "gender", "maritalStatus", "nationality", "stateOfOrigin", "homeAddress",
  "nextOfKinName", "nextOfKinPhone", "nextOfKinRelationship", "bankName", "bankAccountName", "bankAccountNumber",
];
const EXAMPLE = [
  "BHB-0099", "Amina Yusuf", "amina.yusuf@example.com", "08011122233", "Academics", "TEACHER", "TEACHING", "FULL_TIME",
  "2024-09-01", "1990-05-14", "FEMALE", "MARRIED", "Nigerian", "Kano", "12 Ahmadu Bello Way, Kano",
  "Musa Yusuf", "08099911122", "Spouse", "GTBank", "Amina Yusuf", "0123456789",
];
const NOTES = [
  "# staffCode must be unique — matching an existing code UPDATES that staff member; a new code CREATES one",
  "# departmentName must match an existing Department name exactly (see Settings) — this import does not create departments",
  "# role: SUPER_ADMIN, HR_ADMIN, SUPERVISOR, TEACHER, HOUSE_PARENT, SUPPORT_STAFF",
  "# category: TEACHING, NON_TEACHING",
  "# employmentType: FULL_TIME, PART_TIME, VOLUNTEER",
  "# gender: MALE, FEMALE  |  maritalStatus: SINGLE, MARRIED, DIVORCED, WIDOWED (all optional)",
  "# dates use YYYY-MM-DD",
  "# salary is deliberately NOT in this template — bulk CSV is a poor channel for the most sensitive field on",
  "# a staff record (files get emailed/forwarded/left in Downloads folders); set it per-person on the Edit Staff page",
  "# delete the example row and these notes before importing",
];

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const csv = [toCsvRow(HEADER), toCsvRow(EXAMPLE), "", ...NOTES].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="staff-import-template.csv"',
    },
  });
}
