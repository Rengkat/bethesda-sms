"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function DonationVoidButton({ donationId }: { donationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/donations/${donationId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: formData.get("reason") }),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not void this donation.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        Void
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Void this donation">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}
          <p className="text-sm text-muted">
            This keeps the record (marked voided, excluded from totals) rather than deleting it —
            financial records need a trail of who voided it and why, not a disappearance.
          </p>
          <div>
            <label htmlFor="d-void-reason" className="block text-sm font-medium text-foreground mb-1.5">
              Reason
            </label>
            <textarea
              id="d-void-reason"
              name="reason"
              rows={2}
              required
              placeholder="e.g. Duplicate entry, cheque bounced"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? "Voiding…" : "Void donation"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
