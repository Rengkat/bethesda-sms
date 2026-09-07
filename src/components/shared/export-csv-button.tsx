import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A plain CSV download link for data that isn't naturally date-ranged
 * (the full staff roster, the full leave register). For date-bounded
 * exports (attendance, visitors, donations), use DateRangeExportButton
 * instead. */
export function ExportCsvButton({ href, label = "Export CSV" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="secondary">
      <a href={href}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}
