"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function AddDeductionButton({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch(`/api/staff/${staffId}/deductions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not add this deduction.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Add deduction
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add a salary deduction">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <p className="text-sm text-muted">
            For a one-off reason not tied to a query — a cash advance repayment, damaged
            equipment, etc. It&apos;s automatically picked up the next time payroll is generated
            for this staff member.
          </p>

          <div>
            <label htmlFor="ded-reason" className="block text-sm font-medium text-foreground mb-1.5">
              Reason
            </label>
            <input
              id="ded-reason"
              name="reason"
              required
              placeholder="e.g. Salary advance repayment — March"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ded-amount" className="block text-sm font-medium text-foreground mb-1.5">
              Amount (₦)
            </label>
            <input
              id="ded-amount"
              name="amount"
              type="number"
              min={1}
              required
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add deduction"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
