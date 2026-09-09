import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffForm } from "@/components/staff/staff-form";
import { StaffDocumentUploadForm } from "@/components/staff/staff-document-upload-form";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { serializeStaffForClient } from "@/lib/serialize";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Edit staff" };

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [staff, departments, session] = await Promise.all([
    prisma.staff.findUnique({ where: { id }, include: { documents: { orderBy: { uploadedAt: "desc" } } } }).catch(() => null),
    prisma.department.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!staff) notFound();

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEditSalary = Boolean(role && can(role as never, "staff:edit-salary"));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title={`Edit ${staff.fullName}`} description={staff.staffCode} />

      <Card>
        <CardContent>
          <StaffForm departments={departments} canEditSalary={canEditSalary} staff={serializeStaffForClient(staff)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {staff.documents.length > 0 && (
            <ul className="divide-y divide-border">
              {staff.documents.map((d) => (
                <li key={d.id} className="py-2.5 flex items-center justify-between text-sm gap-4">
                  <div>
                    <p className="font-medium text-foreground">{d.label}</p>
                    <p className="text-muted text-xs">
                      {d.type ? formatLabel(d.type) : "Uncategorised"}
                      {d.expiresAt ? ` · Expires ${formatDate(d.expiresAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.expiresAt && d.expiresAt < new Date() && <Badge tone="warning">Expired</Badge>}
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-brand underline underline-offset-2">
                      View<span className="sr-only"> {d.label} (opens in a new tab)</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <StaffDocumentUploadForm staffId={staff.id} />
        </CardContent>
      </Card>
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
