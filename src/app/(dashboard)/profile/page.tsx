import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNaira } from "@/lib/utils";
import { QueryResponseForm } from "@/components/queries/query-response-form";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const staffId = (session?.user as { staffId?: string | null } | undefined)?.staffId;

  const [queries, payslips] = staffId
    ? await Promise.all([
        prisma.staffQuery.findMany({ where: { staffId }, orderBy: { dateIssued: "desc" } }).catch(() => []),
        prisma.payslip
          .findMany({ where: { staffId }, include: { period: true }, orderBy: { createdAt: "desc" } })
          .catch(() => []),
      ])
    : [[], []];

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="My profile" description="Your account details." />
      <Card>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={session?.user.name ?? "—"} />
          <Row label="Email" value={session?.user.email ?? "—"} />
          <Row label="Role" value={(session?.user as { role?: string })?.role ?? "—"} />
        </CardContent>
      </Card>

      {staffId && (
        <Card>
          <CardHeader>
            <CardTitle>My queries</CardTitle>
          </CardHeader>
          <CardContent>
            {queries.length === 0 ? (
              <p className="text-sm text-muted">No queries on your record.</p>
            ) : (
              <ul className="divide-y divide-border">
                {queries.map((q) => (
                  <li key={q.id} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-medium text-foreground">{q.subject}</p>
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
                        {q.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-muted mt-1">{q.description}</p>
                    {q.responseDeadline && q.status === "PENDING_RESPONSE" && (
                      <p className="text-muted text-xs mt-1">
                        Please respond by {formatDate(q.responseDeadline)}.
                      </p>
                    )}
                    {q.status === "PENDING_RESPONSE" ? (
                      <QueryResponseForm queryId={q.id} />
                    ) : (
                      q.staffResponse && (
                        <p className="text-muted italic mt-2">Your response: {q.staffResponse}</p>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {staffId && payslips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {payslips.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                  <span>
                    {MONTHS[p.period.month - 1]} {p.period.year}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{formatNaira(p.netPay)}</span>
                    <Badge tone={p.period.status === "PAID" ? "success" : "neutral"}>
                      {p.period.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
