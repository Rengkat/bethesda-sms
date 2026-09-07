import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A plain GET form (no client JS) that filters the current page's table
 * by date range via URL search params (?from=&to=) — separate from
 * DateRangeExportButton, which downloads a file instead of changing what
 * the page displays. Server components read `from`/`to` from
 * `searchParams` and apply them to the query.
 */
export function DateRangeFilterForm({ from, to }: { from?: string; to?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="filter-from" className="block text-xs font-medium text-muted mb-1">
          From
        </label>
        <input
          id="filter-from"
          name="from"
          type="date"
          defaultValue={from}
          className="rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none"
        />
      </div>
      <div>
        <label htmlFor="filter-to" className="block text-xs font-medium text-muted mb-1">
          To
        </label>
        <input
          id="filter-to"
          name="to"
          type="date"
          defaultValue={to}
          className="rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none"
        />
      </div>
      <Button type="submit" variant="secondary" size="md">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filter
      </Button>
      {(from || to) && (
        <a href="?" className="text-sm text-muted underline underline-offset-2 mb-2.5">
          Clear
        </a>
      )}
    </form>
  );
}
