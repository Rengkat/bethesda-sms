import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsTabs } from "@/components/shared/settings-tabs";
import { DeviceCreateButton } from "@/components/shared/device-create-button";
import { CopyButton } from "@/components/shared/copy-button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Devices" };

export default async function DevicesSettingsPage() {
  const devices = await prisma.device.findMany({ orderBy: { name: "asc" } }).catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Departments, shift types, and devices."
        actions={<DeviceCreateButton />}
      />

      <SettingsTabs active="devices" />

      <Card className="overflow-hidden">
        {devices.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No devices registered"
            description="Register the ZKTeco K40 terminal(s) and their local IP so the Raspberry Pi sync bridge can report which device each log came from."
          />
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-muted text-xs">{d.location} · {d.localIp}</p>
                  <p className="text-muted text-xs mt-1 flex items-center gap-1.5">
                    <span>
                      DEVICE_ID: <code className="px-1 py-0.5 rounded bg-gray-100">{d.id}</code>
                    </span>
                    <CopyButton value={d.id} />
                  </p>
                </div>
                <Badge tone={d.lastSyncAt ? "success" : "neutral"}>
                  {d.lastSyncAt ? "Synced" : "Never synced"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
