import type { Donation, Staff } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNaira } from "@/lib/utils";
import { DonationEditButton } from "./donation-edit-button";
import { DonationVoidButton } from "./donation-void-button";

type DonationRow = Donation & { receivedBy: Staff };

export function DonationTable({ donations, staff }: { donations: DonationRow[]; staff: Staff[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Donations log</caption>
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Donor</th>
            <th scope="col" className="px-5 py-3 font-medium">Type</th>
            <th scope="col" className="px-5 py-3 font-medium">Amount / description</th>
            <th scope="col" className="px-5 py-3 font-medium">Purpose</th>
            <th scope="col" className="px-5 py-3 font-medium">Received by</th>
            <th scope="col" className="px-5 py-3 font-medium">Date</th>
            <th scope="col" className="px-5 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {donations.map((d) => (
            <tr key={d.id} className={d.voided ? "opacity-50" : "hover:bg-brand-blue-light/40"}>
              <td className="px-5 py-3">
                <p className="font-medium text-foreground">
                  {d.donorName} {d.voided && <Badge tone="danger" className="ml-1">Voided</Badge>}
                </p>
                <p className="text-muted text-xs">{formatLabel(d.donorType)}</p>
                {d.voided && d.voidReason && (
                  <p className="text-muted text-xs italic">Reason: {d.voidReason}</p>
                )}
              </td>
              <td className="px-5 py-3">
                <Badge tone={d.donationType === "IN_KIND" ? "brand" : "success"}>
                  {formatLabel(d.donationType)}
                </Badge>
              </td>
              <td className="px-5 py-3 text-muted">
                {d.donationType === "IN_KIND"
                  ? d.inKindDescription ?? "—"
                  : d.amount
                  ? formatNaira(d.amount.toString())
                  : "—"}
              </td>
              <td className="px-5 py-3 text-muted">{d.purpose ?? "—"}</td>
              <td className="px-5 py-3 text-muted">{d.receivedBy.fullName}</td>
              <td className="px-5 py-3 text-muted">{formatDate(d.donatedAt)}</td>
              <td className="px-5 py-3">
                {!d.voided && (
                  <div className="flex items-center justify-end gap-2">
                    <DonationEditButton donation={d} staff={staff} />
                    <DonationVoidButton donationId={d.id} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
