import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsvRow } from "@/lib/csv";

const HEADER = ["staffCode", "deviceName", "timestamp", "type"];
const EXAMPLE = ["BHB-0042", "Main Entrance K40", "2026-03-04 07:42", "CHECK_IN"];
const NOTES = [
  "# staffCode must match an existing Staff.staffCode",
  "# deviceName must match an existing Device name exactly (see Settings > Devices) —",
  "# use the device that was actually down, so it's clear later which outage this covers",
  "# timestamp format: YYYY-MM-DD HH:mm (24-hour clock)",
  "# type: CHECK_IN or CHECK_OUT",
  "# every imported row is recorded as a manual override, same as a single manual entry",
  "# delete the example row and these notes before importing",
];

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "attendance:manual-override")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const csv = [toCsvRow(HEADER), toCsvRow(EXAMPLE), "", ...NOTES].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="attendance-import-template.csv"',
    },
  });
}
