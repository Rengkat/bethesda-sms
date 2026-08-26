"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { LeaveType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function LeaveRequestCreateButton({ leaveTypes }: { leaveTypes: LeaveType[] }) {
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

    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not submit this request.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New request
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Request leave">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="leaveTypeId" className="block text-sm font-medium text-foreground mb-1.5">
              Leave type
            </label>
            <select
              id="leaveTypeId"
              name="leaveTypeId"
              required
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1.5">
                Start date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-1.5">
                End date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1.5">
              Reason (optional)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
