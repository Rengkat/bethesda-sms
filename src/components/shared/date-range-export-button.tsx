"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function DateRangeExportButton({
  exportUrl,
  label = "Export",
}: {
  exportUrl: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams({
      from: String(formData.get("from")),
      to: String(formData.get("to")),
    });
    const separator = exportUrl.includes("?") ? "&" : "?";
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${exportUrl}${separator}${params.toString()}`;
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dre-from" className="block text-sm font-medium text-foreground mb-1.5">
                From
              </label>
              <input
                id="dre-from"
                name="from"
                type="date"
                required
                defaultValue={isoDate(startOfYear)}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="dre-to" className="block text-sm font-medium text-foreground mb-1.5">
                To
              </label>
              <input
                id="dre-to"
                name="to"
                type="date"
                required
                defaultValue={isoDate(today)}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download CSV
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
