import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNaira } from "@/lib/utils";
import { IssueQueryButton } from "@/components/staff/issue-query-button";
import { QueryResolveButton } from "@/components/staff/query-resolve-button";

export const metadata = { title: "Staff profile" };

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [staff, session] = await Promise.all([
    prisma.staff
      .findUnique({
        where: { id },
        include: {
          department: true,
          documents: { orderBy: { uploadedAt: "desc" } },
          qualifications: { include: { certificateDoc: true }, orderBy: { yearObtained: "desc" } },
          leaveRequests: { orderBy: { createdAt: "desc" }, take: 5 },
          attendances: { orderBy: { timestamp: "desc" }, take: 10, include: { device: true } },
          queriesReceived: { include: { issuedBy: true }, orderBy: { dateIssued: "desc" } },
        },
      })
      .catch(() => null),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!staff) notFound();

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canViewSalary = Boolean(role && can(role as never, "staff:view-salary"));
  const canResolveQuery = Boolean(role && can(role as never, "staff:resolve-query"));

  let canIssueQuery = Boolean(role && can(role as never, "staff:issue-query"));
  if (!canIssueQuery && role === "SUPERVISOR") {
    const supervisorStaffId = (session?.user as { staffId?: string | null } | undefined)?.staffId;
    if (supervisorStaffId) {
      const supervisor = await prisma.staff.findUnique({ where: { id: supervisorStaffId } }).catch(() => null);
      canIssueQuery = Boolean(supervisor && supervisor.departmentId === staff.departmentId);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={staff.fullName}
        description={`${staff.staffCode} · ${staff.department.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={staff.category === "TEACHING" ? "brand" : "neutral"}>
              {formatLabel(staff.category)}
            </Badge>
            <Badge tone={staff.active ? "success" : "neutral"}>
              {staff.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: identity & personal detail */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            {staff.passportPhotoUrl && (
              <div className="px-6 pt-6">
                <Image
                  src={staff.passportPhotoUrl}
                  alt={`${staff.fullName} passport photo`}
                  width={96}
                  height={96}
                  className="rounded-md object-cover border border-border"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle>Employment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Role" value={formatLabel(staff.role)} />
              <Row label="Category" value={formatLabel(staff.category)} />
              <Row label="Employment type" value={formatLabel(staff.employmentType)} />
              <Row label="Department" value={staff.department.name} />
              <Row label="Date hired" value={formatDate(staff.dateHired)} />
              {staff.dateExited && <Row label="Date exited" value={formatDate(staff.dateExited)} />}
              <Row label="Email" value={staff.email ?? "—"} />
              <Row label="Phone" value={staff.phone ?? "—"} />
              {canViewSalary && (
                <Row
                  label="Monthly salary"
                  value={staff.currentSalary ? formatNaira(staff.currentSalary) : "—"}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row
                label="Date of birth"
                value={staff.dateOfBirth ? formatDate(staff.dateOfBirth) : "—"}
              />
              <Row label="Gender" value={staff.gender ? formatLabel(staff.gender) : "—"} />
              <Row
                label="Marital status"
                value={staff.maritalStatus ? formatLabel(staff.maritalStatus) : "—"}
              />
              <Row label="Nationality" value={staff.nationality ?? "—"} />
              <Row label="State of origin" value={staff.stateOfOrigin ?? "—"} />
              <Row label="Home address" value={staff.homeAddress ?? "—"} />
              <Row label="Visually impaired" value={staff.isVisuallyImpaired ? "Yes" : "No"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next of kin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Name" value={staff.nextOfKinName ?? "—"} />
              <Row label="Phone" value={staff.nextOfKinPhone ?? "—"} />
              <Row label="Relationship" value={staff.nextOfKinRelationship ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Bank" value={staff.bankName ?? "—"} />
              <Row label="Account name" value={staff.bankAccountName ?? "—"} />
              <Row
                label="Account number"
                value={staff.bankAccountNumber ? maskAccountNumber(staff.bankAccountNumber) : "—"}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: qualifications, documents, discipline, attendance, leave */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.qualifications.length === 0 ? (
                <p className="text-sm text-muted">No qualifications recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staff.qualifications.map((q) => (
                    <li key={q.id} className="py-2.5 flex items-center justify-between text-sm gap-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {formatLabel(q.level)}
                          {q.fieldOfStudy ? ` — ${q.fieldOfStudy}` : ""}
                        </p>
                        <p className="text-muted">
                          {q.awardingBody}
                          {q.grade ? ` · ${q.grade}` : ""}
                          {q.yearObtained ? ` · ${q.yearObtained}` : ""}
                        </p>
                      </div>
                      {q.certificateDoc && (
                        <a
                          href={q.certificateDoc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-brand underline underline-offset-2 shrink-0"
                        >
                          View certificate
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.documents.length === 0 ? (
                <p className="text-sm text-muted">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staff.documents.map((d) => {
                    const expired = d.expiresAt ? d.expiresAt < new Date() : false;
                    return (
                      <li key={d.id} className="py-2.5 flex items-center justify-between text-sm gap-4">
                        <div>
                          <p className="font-medium text-foreground">{d.label}</p>
                          <p className="text-muted">
                            {d.type ? formatLabel(d.type) : "Uncategorised"}
                            {d.expiresAt ? ` · Expires ${formatDate(d.expiresAt)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {expired && <Badge tone="warning">Expired</Badge>}
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-brand underline underline-offset-2"
                          >
                            View
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Discipline &amp; queries</CardTitle>
              {canIssueQuery && <IssueQueryButton staffId={staff.id} />}
            </CardHeader>
            <CardContent>
              {staff.queriesReceived.length === 0 ? (
                <p className="text-sm text-muted">No queries on record.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staff.queriesReceived.map((q) => (
                    <li key={q.id} className="py-3 space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">{q.subject}</p>
                          <p className="text-muted text-xs">
                            {formatLabel(q.category)} · Issued by {q.issuedBy.fullName} ·{" "}
                            {formatDate(q.dateIssued)}
                          </p>
                        </div>
                        <Badge
                          tone={
                            q.status === "RESOLVED"
                              ? "success"
                              : q.status === "ESCALATED"
                              ? "danger"
                              : q.status === "RESPONDED"
                              ? "brand"
                              : "warning"
                          }
                        >
                          {formatLabel(q.status)}
                        </Badge>
                      </div>
                      <p className="text-muted">{q.description}</p>
                      {q.staffResponse && (
                        <p className="text-muted italic">
                          Response: {q.staffResponse}
                          {q.respondedAt ? ` (${formatDate(q.respondedAt)})` : ""}
                        </p>
                      )}
                      {q.deductionAmount && (
                        <p className="text-danger font-medium">
                          Deduction: {formatNaira(q.deductionAmount)}
                          {q.payslipId ? " · already applied to a payslip" : " · pending next payroll run"}
                        </p>
                      )}
                      {canResolveQuery && q.status !== "RESOLVED" && (
                        <QueryResolveButton queryId={q.id} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent leave</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.leaveRequests.length === 0 ? (
                <p className="text-sm text-muted">No leave requests yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staff.leaveRequests.map((l) => (
                    <li key={l.id} className="py-2.5 flex items-center justify-between text-sm">
                      <span>
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </span>
                      <Badge
                        tone={
                          l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "warning" : "neutral"
                        }
                      >
                        {formatLabel(l.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
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

function maskAccountNumber(accountNumber: string) {
  if (accountNumber.length <= 4) return accountNumber;
  return `••••${accountNumber.slice(-4)}`;
}
