import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { toCsvRow } from "@/lib/csv";

// Full-access only (not department-scoped like viewing the staff list) —
// a bulk export of personal/bank detail for every staff member is a
// bigger blast radius than browsing one profile at a time. Salary is
// excluded regardless of who's asking — see the template route for why.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.staff.findMany({
    include: { department: true },
    orderBy: { fullName: "asc" },
  });

  const header = [
    "staffCode", "fullName", "email", "phone", "departmentName", "role", "category", "employmentType",
    "active", "dateHired", "dateExited", "dateOfBirth", "gender", "maritalStatus", "nationality",
    "stateOfOrigin", "homeAddress", "nextOfKinName", "nextOfKinPhone", "nextOfKinRelationship",
    "bankName", "bankAccountName", "bankAccountNumber",
  ];

  const csvLines = [
    toCsvRow(header),
    ...staff.map((s) =>
      toCsvRow([
        s.staffCode,
        s.fullName,
        s.email,
        s.phone,
        s.department.name,
        s.role,
        s.category,
        s.employmentType,
        s.active ? "Yes" : "No",
        formatDate(s.dateHired),
        s.dateExited ? formatDate(s.dateExited) : "",
        s.dateOfBirth ? formatDate(s.dateOfBirth) : "",
        s.gender,
        s.maritalStatus,
        s.nationality,
        s.stateOfOrigin,
        s.homeAddress,
        s.nextOfKinName,
        s.nextOfKinPhone,
        s.nextOfKinRelationship,
        s.bankName,
        s.bankAccountName,
        s.bankAccountNumber,
      ]),
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="staff-export.csv"',
    },
  });
}
