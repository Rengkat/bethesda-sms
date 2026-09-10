import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import Image from "next/image";
import {
  Pencil,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  FileText,
  Gavel as GavelIcon,
  Wallet,
  IdCard,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNaira, initials } from "@/lib/utils";
import { IssueQueryButton } from "@/components/staff/issue-query-button";
import { QueryResolveButton } from "@/components/staff/query-resolve-button";
import { AddDeductionButton } from "@/components/staff/add-deduction-button";
import { ExportAttendanceButton } from "@/components/staff/export-attendance-button";

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
          deductionsReceived: { include: { issuedBy: true }, orderBy: { dateIssued: "desc" } },
        },
      })
      .catch(() => null),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!staff) notFound();

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEditStaff = Boolean(role && can(role as never, "staff:edit"));
  const canViewSalary = Boolean(role && can(role as never, "staff:view-salary"));
  const canResolveQuery = Boolean(role && can(role as never, "staff:resolve-query"));
  const canIssueDeduction = Boolean(role && can(role as never, "staff:issue-deduction"));
  const canExportOthers = Boolean(role && can(role as never, "reports:export"));
  const ownStaffId = (session?.user as { staffId?: string | null } | undefined)?.staffId;
  const canExportAttendance = canExportOthers || ownStaffId === staff.id;

  let canIssueQuery = Boolean(role && can(role as never, "staff:issue-query"));
  if (!canIssueQuery && role === "SUPERVISOR") {
    const supervisorStaffId = (session?.user as { staffId?: string | null } | undefined)?.staffId;
    if (supervisorStaffId) {
      const supervisor = await prisma.staff
        .findUnique({ where: { id: supervisorStaffId } })
        .catch(() => null);
      canIssueQuery = Boolean(supervisor && supervisor.departmentId === staff.departmentId);
    }
  }

  const pendingDeductionTotal =
    staff.queriesReceived
      .filter((q) => q.deductionAmount && !q.payslipId)
      .reduce((sum, q) => sum + Number(q.deductionAmount ?? 0), 0) +
    staff.deductionsReceived
      .filter((d) => !d.payslipId)
      .reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-blue to-brand-blue-dark px-6 py-8 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="shrink-0">
              {staff.passportPhotoUrl ? (
                <Image
                  src={staff.passportPhotoUrl}
                  alt={`${staff.fullName} passport photo`}
                  width={80}
                  height={80}
                  className="rounded-2xl object-cover border-4 border-white/30 shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 border-4 border-white/30 text-white text-2xl font-bold shadow-lg">
                  {initials(staff.fullName)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{staff.fullName}</h1>
              <p className="text-white/80 mt-0.5">
                {staff.staffCode} · {staff.department.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge tone={staff.category === "TEACHING" ? "brand" : "neutral"}>
                  {staff.category ? formatLabel(staff.category) : "Uncategorised"}
                </Badge>
                <Badge tone={staff.active ? "success" : "neutral"}>
                  {staff.active ? "Active" : "Inactive"}
                </Badge>
                <Badge tone="neutral">{formatLabel(staff.role)}</Badge>
                {pendingDeductionTotal > 0 && (
                  <Badge tone="warning">
                    {formatNaira(pendingDeductionTotal)} pending deduction
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="secondary" className="bg-white/95 hover:bg-white">
                <Link href={`/staff/${staff.id}/id-card`}>
                  <IdCard className="h-4 w-4" aria-hidden="true" />
                  ID card
                </Link>
              </Button>
              {canEditStaff && (
                <Button asChild variant="secondary" className="bg-white/95 hover:bg-white">
                  <Link href={`/staff/${staff.id}/edit`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit staff
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 px-6 py-4 sm:px-8 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {staff.email ?? "No email on file"}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {staff.phone ?? "No phone on file"}
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Hired {formatDate(staff.dateHired)}
          </span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: personal detail */}
        <div className="lg:col-span-1 space-y-6">
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
              {staff.dateExited && <Row label="Date exited" value={formatDate(staff.dateExited)} />}
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
            <CardHeader className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted" aria-hidden="true" />
              <CardTitle>Bank &amp; salary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Bank" value={staff.bankName ?? "—"} />
              <Row label="Account name" value={staff.bankAccountName ?? "—"} />
              <Row
                label="Account number"
                value={staff.bankAccountNumber ? maskAccountNumber(staff.bankAccountNumber) : "—"}
              />
              {canViewSalary && (
                <Row
                  label="Monthly salary"
                  value={staff.currentSalary ? formatNaira(staff.currentSalary) : "—"}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: qualifications, documents, discipline, deductions, attendance, leave */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted" aria-hidden="true" />
              <CardTitle>Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.qualifications.length === 0 ? (
                <p className="text-sm text-muted">No qualifications recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staff.qualifications.map((q) => (
                    <li
                      key={q.id}
                      className="py-2.5 flex items-center justify-between text-sm gap-4">
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
                          className="text-sm text-brand underline underline-offset-2 shrink-0">
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
            <CardHeader className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
                <CardTitle>Documents</CardTitle>
              </span>
              {canEditStaff && (
                <Link
                  href={`/staff/${staff.id}/edit`}
                  className="text-sm text-brand underline underline-offset-2">
                  Upload
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {staff.documents.length === 0 ? (
                <p className="text-sm text-muted">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {staff.documents.map((d) => {
                    const expired = d.expiresAt ? d.expiresAt < new Date() : false;
                    return (
                      <li
                        key={d.id}
                        className="py-2.5 flex items-center justify-between text-sm gap-4">
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
                            className="text-sm text-brand underline underline-offset-2">
                            View<span className="sr-only"> {d.label} (opens in a new tab)</span>
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
            <CardHeader className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GavelIcon className="h-4 w-4 text-muted" aria-hidden="true" />
                <CardTitle>Discipline, queries &amp; deductions</CardTitle>
              </span>
              <div className="flex items-center gap-2">
                {canIssueDeduction && <AddDeductionButton staffId={staff.id} />}
                {canIssueQuery && <IssueQueryButton staffId={staff.id} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.queriesReceived.length === 0 && staff.deductionsReceived.length === 0 ? (
                <p className="text-sm text-muted">Nothing on record.</p>
              ) : (
                <>
                  {staff.queriesReceived.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-border p-3 space-y-2 text-sm">
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
                          }>
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
                          {q.payslipId
                            ? " · already applied to a payslip"
                            : " · pending next payroll run"}
                        </p>
                      )}
                      {canResolveQuery && q.status !== "RESOLVED" && (
                        <QueryResolveButton queryId={q.id} />
                      )}
                    </div>
                  ))}

                  {staff.deductionsReceived.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-border p-3 flex items-start justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{d.reason}</p>
                        <p className="text-muted text-xs">
                          Added by {d.issuedBy.fullName} · {formatDate(d.dateIssued)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-danger font-medium">{formatNaira(d.amount)}</p>
                        <Badge tone={d.payslipId ? "success" : "warning"}>
                          {d.payslipId ? "Applied" : "Pending payroll"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
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
                          l.status === "APPROVED"
                            ? "success"
                            : l.status === "REJECTED"
                              ? "warning"
                              : "neutral"
                        }>
                        {formatLabel(l.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Recent attendance</CardTitle>
              {canExportAttendance && <ExportAttendanceButton staffId={staff.id} />}
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
                        }>
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
