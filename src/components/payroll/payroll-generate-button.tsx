"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PayrollGenerateButton() {
  const router = useRouter();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not generate this payroll period.");
      return;
    }

    const created = await res.json();
    setOpen(false);
    router.push(`/payroll/${created.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Generate payroll
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate a payroll period">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-month" className="block text-sm font-medium text-foreground mb-1.5">
                Month
              </label>
              <select
                id="p-month"
                name="month"
                required
                defaultValue={now.getMonth() + 1}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-year" className="block text-sm font-medium text-foreground mb-1.5">
                Year
              </label>
              <input
                id="p-year"
                name="year"
                type="number"
                required
                defaultValue={now.getFullYear()}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-late" className="block text-sm font-medium text-foreground mb-1.5">
                Deduction per late day (₦)
              </label>
              <input
                id="p-late"
                name="lateDeductionPerOccurrence"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="p-absence" className="block text-sm font-medium text-foreground mb-1.5">
                Deduction per absent day (₦)
              </label>
              <input
                id="p-absence"
                name="absenceDeductionPerOccurrence"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-muted">
            Leave both at 0 to only apply resolved query deductions. Every active staff member
            with a salary on file gets a payslip — a snapshot of their salary at the time you
            generate this, plus these deductions.
          </p>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Generating…" : "Generate"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
