import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
