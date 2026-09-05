"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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

export function VisitorRegisterButton() {
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

    const res = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not register this visitor.");
      return;
    }

    setOpen(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Register visitor
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Register a visitor">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <Field id="v-fullName" name="fullName" label="Full name" required />

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="v-phone" name="phone" label="Phone" type="tel" />
            <Field id="v-organization" name="organization" label="Organization" />
          </div>

          <div>
            <label htmlFor="v-category" className="block text-sm font-medium text-foreground mb-1.5">
              Category
            </label>
            <select
              id="v-category"
              name="category"
              required
              defaultValue="GENERAL"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <Field id="v-personToSee" name="personToSee" label="Who they're here to see" required placeholder="Name or department" />
          <Field id="v-purposeOfVisit" name="purposeOfVisit" label="Purpose of visit" required />
          <Field id="v-badgeNumber" name="badgeNumber" label="Visitor badge number" />

          <div>
            <label htmlFor="v-notes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              id="v-notes"
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign visitor in"}
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
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
      />
    </div>
  );
}
