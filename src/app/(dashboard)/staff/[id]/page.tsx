import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Staff profile" };

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const staff = await prisma.staff
    .findUnique({
      where: { id },
      include: {
        department: true,
        documents: true,
        attendances: { orderBy: { timestamp: "desc" }, take: 10, include: { device: true } },
      },
    })
    .catch(() => null);

  if (!staff) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={staff.fullName}
        description={`${staff.staffCode} · ${staff.department.name}`}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Role" value={formatLabel(staff.role)} />
            <Row label="Employment type" value={formatLabel(staff.employmentType)} />
            <Row label="Email" value={staff.email ?? "—"} />
            <Row label="Phone" value={staff.phone ?? "—"} />
            <Row label="Date hired" value={formatDate(staff.dateHired)} />
            <Row
              label="Status"
              value={<Badge tone={staff.active ? "success" : "neutral"}>{staff.active ? "Active" : "Inactive"}</Badge>}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {staff.attendances.length === 0 ? (
              <p className="text-sm text-muted">No attendance logged yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {staff.attendances.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                    <span>
                      {a.type === "CHECK_IN" ? "Checked in" : "Checked out"} at {a.device.name}
                    </span>
                    <Badge
                      tone={
                        a.status === "ON_TIME"
                          ? "success"
                          : a.status === "LATE" || a.status === "EARLY_DEPARTURE"
                          ? "warning"
                          : "brand"
                      }
                    >
                      {formatLabel(a.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
