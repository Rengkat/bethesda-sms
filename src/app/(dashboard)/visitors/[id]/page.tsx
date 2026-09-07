import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate, formatTime, formatNaira } from "@/lib/utils";
import { VisitorEditButton } from "@/components/visitors/visitor-edit-button";
import { VisitorVoidButton } from "@/components/visitors/visitor-void-button";
import { VisitorCheckoutButton } from "@/components/visitors/visitor-checkout-button";
import { RecordVisitorDonationButton } from "@/components/visitors/record-visitor-donation-button";

export const metadata = { title: "Visitor" };

export default async function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [visitor, session] = await Promise.all([
    prisma.visitor
      .findUnique({ where: { id }, include: { donations: { orderBy: { donatedAt: "desc" } } } })
      .catch(() => null),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!visitor) notFound();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarding `donations` on purpose, see the comment below
  const { donations: _donations, ...visitorWithoutDonations } = visitor;

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canVoid = Boolean(role && can(role as never, "visitors:void"));
  const canSeeDonationAmounts = Boolean(role && can(role as never, "donations:manage"));

  const totalGiven = visitor.donations
    .filter((d) => !d.voided && d.donationType !== "IN_KIND")
    .reduce((sum, d) => sum + Number(d.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={visitor.fullName}
        description={visitor.organization ?? formatLabel(visitor.category)}
        actions={
          <>
            {visitor.voided && <Badge tone="danger">Voided</Badge>}
            {!visitor.voided && !visitor.timeOut && <VisitorCheckoutButton visitorId={visitor.id} />}
            {/* Strip `donations` before this crosses into the client
                component — Donation.amount is a Prisma Decimal, and
                VisitorEditButton doesn't touch donations anyway. */}
            {!visitor.voided && <VisitorEditButton visitor={visitorWithoutDonations} />}
            {!visitor.voided && canVoid && <VisitorVoidButton visitorId={visitor.id} />}
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visit details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Category" value={formatLabel(visitor.category)} />
              <Row label="Phone" value={visitor.phone ?? "—"} />
              <Row label="Organization" value={visitor.organization ?? "—"} />
              <Row label="Here to see" value={visitor.personToSee} />
              <Row label="Purpose" value={visitor.purposeOfVisit} />
              <Row label="Badge #" value={visitor.badgeNumber ?? "—"} />
              <Row label="Time in" value={`${formatDate(visitor.timeIn)} ${formatTime(visitor.timeIn)}`} />
              <Row
                label="Time out"
                value={visitor.timeOut ? `${formatDate(visitor.timeOut)} ${formatTime(visitor.timeOut)}` : "Still on site"}
              />
              {visitor.notes && <Row label="Notes" value={visitor.notes} />}
              {visitor.voided && visitor.voidReason && (
                <Row label="Void reason" value={visitor.voidReason} />
              )}
            </CardContent>
          </Card>

          {canSeeDonationAmounts && visitor.donations.length > 0 && (
            <Card>
              <CardContent>
                <p className="text-sm text-muted">Total given (cash/transfer/cheque)</p>
                <p className="text-xl font-semibold text-foreground">{formatNaira(totalGiven)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-muted" aria-hidden="true" />
                <CardTitle>Donations from this visitor</CardTitle>
              </span>
              {!visitor.voided && <RecordVisitorDonationButton visitorId={visitor.id} />}
            </CardHeader>
            <CardContent>
              {visitor.donations.length === 0 ? (
                <p className="text-sm text-muted">No donations recorded for this visitor yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {visitor.donations.map((d) => (
                    <li key={d.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {formatLabel(d.donationType)}
                            {d.voided && <Badge tone="danger" className="ml-1">Voided</Badge>}
                          </p>
                          <p className="text-muted text-xs">
                            {formatDate(d.donatedAt)}
                            {d.purpose ? ` · ${d.purpose}` : ""}
                          </p>
                        </div>
                        <p className="font-medium text-foreground shrink-0">
                          {d.donationType === "IN_KIND" ? d.inKindDescription ?? "—" : formatNaira(d.amount ?? 0)}
                        </p>
                      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted shrink-0">{label}</span>
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
