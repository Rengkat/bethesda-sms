import type { Visitor } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatTime, formatDate } from "@/lib/utils";
import { VisitorCheckoutButton } from "./visitor-checkout-button";
import { VisitorEditButton } from "./visitor-edit-button";
import { VisitorVoidButton } from "./visitor-void-button";

export function VisitorTable({ visitors, canVoid }: { visitors: Visitor[]; canVoid: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Visitor sign-in book</caption>
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Visitor</th>
            <th scope="col" className="px-5 py-3 font-medium">Category</th>
            <th scope="col" className="px-5 py-3 font-medium">Here to see</th>
            <th scope="col" className="px-5 py-3 font-medium">Time in</th>
            <th scope="col" className="px-5 py-3 font-medium">Time out</th>
            <th scope="col" className="px-5 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visitors.map((v) => (
            <tr key={v.id} className={v.voided ? "opacity-50" : "hover:bg-brand-blue-light/40"}>
              <td className="px-5 py-3">
                <p className="font-medium text-foreground">
                  {v.fullName} {v.voided && <Badge tone="danger" className="ml-1">Voided</Badge>}
                </p>
                <p className="text-muted text-xs">{v.organization ?? v.phone ?? "—"}</p>
                {v.voided && v.voidReason && (
                  <p className="text-muted text-xs italic">Reason: {v.voidReason}</p>
                )}
              </td>
              <td className="px-5 py-3 text-muted">{formatLabel(v.category)}</td>
              <td className="px-5 py-3 text-muted">{v.personToSee}</td>
              <td className="px-5 py-3 text-muted">
                {formatTime(v.timeIn)}
                <span className="block text-xs">{formatDate(v.timeIn)}</span>
              </td>
              <td className="px-5 py-3">
                {v.timeOut ? (
                  <span className="text-muted">{formatTime(v.timeOut)}</span>
                ) : v.voided ? (
                  <span className="text-muted">—</span>
                ) : (
                  <Badge tone="brand">Still on site</Badge>
                )}
              </td>
              <td className="px-5 py-3">
                {!v.voided && (
                  <div className="flex items-center justify-end gap-2">
                    {!v.timeOut && <VisitorCheckoutButton visitorId={v.id} />}
                    <VisitorEditButton visitor={v} />
                    {canVoid && <VisitorVoidButton visitorId={v.id} />}
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
