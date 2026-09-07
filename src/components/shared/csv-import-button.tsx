"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function CsvImportButton({
  importUrl,
  templateUrl,
  label = "Import CSV",
}: {
  importUrl: string;
  templateUrl: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(importUrl, { method: "POST", body: formData });
    const body = await res.json().catch(() => null);

    setIsSubmitting(false);

    if (!res.ok) {
      setError(body?.message ?? "Import failed.");
      return;
    }

    setResult(body);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <div className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          {result && (
            <div role="status" className="rounded-lg bg-green-50 text-success text-sm px-4 py-3 space-y-1">
              <p>
                Imported {result.created} row{result.created === 1 ? "" : "s"}
                {result.skipped > 0 ? `, skipped ${result.skipped}` : ""}.
              </p>
              {result.errors.length > 0 && (
                <ul className="list-disc list-inside text-xs">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <a
            href={templateUrl}
            className="flex items-center gap-1.5 text-sm text-brand underline underline-offset-2 w-fit"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Download the CSV template
          </a>

          <div>
            <label htmlFor="csv-file" className="block text-sm font-medium text-foreground mb-1.5">
              CSV file
            </label>
            <input
              id="csv-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-blue-dark file:cursor-pointer focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleImport} disabled={isSubmitting}>
              {isSubmitting ? "Importing…" : "Import"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
