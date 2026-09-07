"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOCUMENT_TYPES = [
  ["ID_CARD", "ID card"],
  ["CONTRACT", "Contract"],
  ["QUALIFICATION_CERTIFICATE", "Qualification certificate"],
  ["EXAM_RESULT", "Exam result (WAEC/SSCE etc.)"],
  ["MEDICAL_REPORT", "Medical report"],
  ["OTHER", "Other"],
] as const;

export function StaffDocumentUploadForm({ staffId }: { staffId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/staff/${staffId}/documents`, {
      method: "POST",
      body: formData,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not upload this document.");
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="doc-label" className="block text-sm font-medium text-foreground mb-1.5">
            Label
          </label>
          <input
            id="doc-label"
            name="label"
            required
            placeholder="e.g. 2021 NCE Certificate"
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
          />
        </div>
        <div>
          <label htmlFor="doc-type" className="block text-sm font-medium text-foreground mb-1.5">
            Type
          </label>
          <select
            id="doc-type"
            name="type"
            defaultValue="OTHER"
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
          >
            {DOCUMENT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="doc-expiresAt" className="block text-sm font-medium text-foreground mb-1.5">
          Expiry date (optional)
        </label>
        <input
          id="doc-expiresAt"
          name="expiresAt"
          type="date"
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor="doc-file" className="block text-sm font-medium text-foreground mb-1.5">
          File (PDF, JPG, PNG, or WEBP — max 10MB)
        </label>
        <input
          id="doc-file"
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-blue-dark file:cursor-pointer focus-visible:outline-none"
        />
      </div>

      <Button type="submit" size="sm" disabled={isSubmitting}>
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Uploading…" : "Upload document"}
      </Button>
    </form>
  );
}
