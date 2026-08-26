"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function DepartmentCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/settings/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name") }),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not create this department.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New department
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="New department">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="dept-name" className="block text-sm font-medium text-foreground mb-1.5">
              Department name
            </label>
            <input
              id="dept-name"
              name="name"
              type="text"
              required
              placeholder="e.g. Academics"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Create department"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
