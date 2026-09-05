"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function QueryResolveButton({ queryId }: { queryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"RESOLVED" | "ESCALATED">("RESOLVED");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch(`/api/queries/${queryId}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not resolve this query.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
        Resolve
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Resolve this query">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="r-status" className="block text-sm font-medium text-foreground mb-1.5">
              Outcome
            </label>
            <select
              id="r-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "RESOLVED" | "ESCALATED")}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              <option value="RESOLVED">Resolved — close it out</option>
              <option value="ESCALATED">Escalated — refer further</option>
            </select>
          </div>

          {status === "RESOLVED" && (
            <div>
              <label htmlFor="r-deduction" className="block text-sm font-medium text-foreground mb-1.5">
                Salary deduction (₦, optional)
              </label>
              <input
                id="r-deduction"
                name="deductionAmount"
                type="number"
                placeholder="Leave blank for no deduction"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
              <p className="text-xs text-muted mt-1.5">
                If set, this is picked up automatically the next time payroll is generated for
                this staff member and shown on their payslip.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Confirm"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
