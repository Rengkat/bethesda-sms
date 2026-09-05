"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const CATEGORIES = [
  ["LATENESS", "Lateness"],
  ["ABSENTEEISM", "Absenteeism"],
  ["MISCONDUCT", "Misconduct"],
  ["POLICY_VIOLATION", "Policy violation"],
  ["PERFORMANCE", "Performance"],
  ["OTHER", "Other"],
] as const;

export function IssueQueryButton({ staffId }: { staffId: string }) {
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

    const res = await fetch(`/api/staff/${staffId}/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not issue this query.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />
        Issue query
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Issue a query">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="q-category" className="block text-sm font-medium text-foreground mb-1.5">
              Category
            </label>
            <select
              id="q-category"
              name="category"
              required
              defaultValue="LATENESS"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="q-subject" className="block text-sm font-medium text-foreground mb-1.5">
              Subject
            </label>
            <input
              id="q-subject"
              name="subject"
              required
              placeholder="e.g. Repeated late check-ins — March"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div>
            <label htmlFor="q-description" className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              id="q-description"
              name="description"
              rows={4}
              required
              placeholder="What happened, and what response is expected."
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div>
            <label htmlFor="q-deadline" className="block text-sm font-medium text-foreground mb-1.5">
              Response deadline (optional)
            </label>
            <input
              id="q-deadline"
              name="responseDeadline"
              type="date"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <p className="text-xs text-muted">
            Whether this ends up attached to a salary deduction is decided when HR resolves it,
            not now.
          </p>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Issuing…" : "Issue query"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
