import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ManualEntryForm } from "@/components/attendance/manual-entry-form";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Manual attendance entry" };

export default async function ManualEntryPage() {
  const [staff, devices] = await Promise.all([
    prisma.staff.findMany({ where: { active: true }, select: { id: true, fullName: true, staffCode: true }, orderBy: { fullName: "asc" } }).catch(() => []),
    prisma.device.findMany({ orderBy: { name: "asc" } }).catch(() => []),
  ]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Manual attendance entry"
        description="Admin override for a missed or incorrect biometric log. Every entry requires a reason and is recorded in the audit log."
      />
      <Card>
        <CardContent>
          <ManualEntryForm staff={staff} devices={devices} />
        </CardContent>
      </Card>
    </div>
  );
}
