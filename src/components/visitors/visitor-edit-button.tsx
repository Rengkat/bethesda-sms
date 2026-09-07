"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Visitor } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const CATEGORIES = [
  ["GENERAL", "General visitor"],
  ["PARENT_GUARDIAN", "Parent / guardian"],
  ["VENDOR_SUPPLIER", "Vendor / supplier"],
  ["GOVERNMENT_OFFICIAL", "Government official"],
  ["DONOR_PARTNER", "Donor / partner"],
  ["VOLUNTEER_PROSPECT", "Prospective volunteer"],
  ["OTHER", "Other"],
] as const;

export function VisitorEditButton({ visitor }: { visitor: Visitor }) {
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

    const res = await fetch(`/api/visitors/${visitor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not update this visitor.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edit
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit visitor entry" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <Field id="ve-fullName" name="fullName" label="Full name" defaultValue={visitor.fullName} required />

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="ve-phone" name="phone" label="Phone" type="tel" defaultValue={visitor.phone ?? ""} />
            <Field id="ve-organization" name="organization" label="Organization" defaultValue={visitor.organization ?? ""} />
          </div>

          <div>
            <label htmlFor="ve-category" className="block text-sm font-medium text-foreground mb-1.5">
              Category
            </label>
            <select
              id="ve-category"
              name="category"
              required
              defaultValue={visitor.category}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Field id="ve-personToSee" name="personToSee" label="Who they're here to see" defaultValue={visitor.personToSee} required />
          <Field id="ve-purposeOfVisit" name="purposeOfVisit" label="Purpose of visit" defaultValue={visitor.purposeOfVisit} required />
          <Field id="ve-badgeNumber" name="badgeNumber" label="Visitor badge number" defaultValue={visitor.badgeNumber ?? ""} />

          <div>
            <label htmlFor="ve-notes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              id="ve-notes"
              name="notes"
              rows={2}
              defaultValue={visitor.notes ?? ""}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
      />
    </div>
  );
}
