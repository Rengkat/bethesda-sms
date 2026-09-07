import { NextResponse } from "next/server";
import { toCsvRow } from "@/lib/csv";

const HEADER = ["fullName", "phone", "organization", "category", "purposeOfVisit", "personToSee", "badgeNumber", "notes"];
const EXAMPLE = [
  "Adaeze Okafor",
  "08012345678",
  "Lagos State Ministry of Education",
  "GOVERNMENT_OFFICIAL",
  "Termly inspection",
  "Principal's office",
  "V-102",
  "Arrived with one colleague",
];
const VALID_CATEGORIES = "GENERAL, PARENT_GUARDIAN, VENDOR_SUPPLIER, GOVERNMENT_OFFICIAL, DONOR_PARTNER, VOLUNTEER_PROSPECT, OTHER";

export async function GET() {
  const csv = [
    toCsvRow(HEADER),
    toCsvRow(EXAMPLE),
    "",
    `# category must be one of: ${VALID_CATEGORIES}`,
    "# delete the example row and the two lines above before importing",
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="visitor-import-template.csv"',
    },
  });
}
