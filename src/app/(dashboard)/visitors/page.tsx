import { headers } from "next/headers";
import { Users2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { VisitorRegisterButton } from "@/components/visitors/visitor-register-button";
import { VisitorTable } from "@/components/visitors/visitor-table";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Visitors" };

export default async function VisitorsPage() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [visitors, todayCount, onSiteCount, session] = await Promise.all([
    prisma.visitor.findMany({ orderBy: { timeIn: "desc" }, take: 100 }).catch(() => []),
    prisma.visitor.count({ where: { timeIn: { gte: startOfDay }, voided: false } }).catch(() => 0),
    prisma.visitor.count({ where: { timeOut: null, voided: false } }).catch(() => 0),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canVoid = Boolean(role && can(role as never, "visitors:void"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description={`Digital sign-in book — ${formatDate(new Date())}`}
        actions={<VisitorRegisterButton />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Visitors today</p>
            <p className="text-xl font-semibold text-foreground">{todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Currently on site</p>
            <p className="text-xl font-semibold text-foreground">{onSiteCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {visitors.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No visitors logged yet"
            description="Register a visitor as they arrive at the front desk — the same record covers signing them out later."
            action={<VisitorRegisterButton />}
          />
        ) : (
          <VisitorTable visitors={visitors} canVoid={canVoid} />
        )}
      </Card>
    </div>
  );
}
