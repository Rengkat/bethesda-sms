"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ShiftTypeCreateButton() {
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

    const res = await fetch("/api/settings/shift-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not create this shift type.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New shift type
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="New shift type">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="shift-name" className="block text-sm font-medium text-foreground mb-1.5">
              Name
            </label>
            <input
              id="shift-name"
              name="name"
              type="text"
              required
              placeholder="e.g. School Day"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-foreground mb-1.5">
                Start time
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-foreground mb-1.5">
                End time
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gracePeriodMinutes" className="block text-sm font-medium text-foreground mb-1.5">
              Grace period (minutes)
            </label>
            <input
              id="gracePeriodMinutes"
              name="gracePeriodMinutes"
              type="number"
              min={0}
              max={120}
              defaultValue={10}
              required
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Create shift type"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
