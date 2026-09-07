"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ExportAttendanceButton({ staffId }: { staffId: string }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams({
      from: String(formData.get("from")),
      to: String(formData.get("to")),
      format: String(formData.get("format")),
    });
    // Not a page navigation — this URL returns a file with
    // Content-Disposition: attachment, so the browser downloads it and
    // stays on this page. router.push() would try to render it as a route.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/staff/${staffId}/attendance/export?${params.toString()}`;
    setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Export attendance
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Export attendance">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-from" className="block text-sm font-medium text-foreground mb-1.5">
                From
              </label>
              <input
                id="exp-from"
                name="from"
                type="date"
                required
                defaultValue={isoDate(startOfYear)}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="exp-to" className="block text-sm font-medium text-foreground mb-1.5">
                To
              </label>
              <input
                id="exp-to"
                name="to"
                type="date"
                required
                defaultValue={isoDate(today)}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exp-format" className="block text-sm font-medium text-foreground mb-1.5">
              Format
            </label>
            <select
              id="exp-format"
              name="format"
              defaultValue="csv"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              <option value="csv">CSV (spreadsheet)</option>
              <option value="pdf">PDF (printable)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
