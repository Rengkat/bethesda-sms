import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Plain server-rendered pagination — no client JS needed, works via
 * ?page=N in the URL. Preserves every other existing query param (date
 * filters, etc.) by taking the full current searchParams and only
 * overwriting `page`.
 */
export function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  searchParams = {},
}: {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between px-5 py-3 border-t border-border text-sm"
    >
      <p className="text-muted">
        Showing {start}–{end} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={hrefFor(currentPage - 1)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-brand-blue-light"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-muted opacity-50">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </span>
        )}
        <span className="text-muted px-2">
          Page {currentPage} of {totalPages}
        </span>
        {currentPage < totalPages ? (
          <Link
            href={hrefFor(currentPage + 1)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-brand-blue-light"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-muted opacity-50">
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
