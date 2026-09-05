"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Donation, Staff } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const DONOR_TYPES = [
  ["INDIVIDUAL", "Individual"],
  ["ORGANIZATION", "Organization"],
  ["CHURCH_FAITH_BASED", "Church / faith-based"],
  ["GOVERNMENT", "Government"],
  ["OTHER", "Other"],
] as const;

const DONATION_TYPES = [
  ["CASH", "Cash"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["CHEQUE", "Cheque"],
  ["IN_KIND", "In-kind (goods/equipment)"],
] as const;

function toDateInputValue(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function DonationEditButton({ donation, staff }: { donation: Donation; staff: Staff[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [donationType, setDonationType] = useState<string>(donation.donationType);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch(`/api/donations/${donation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not update this donation.");
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

      <Modal open={open} onClose={() => setOpen(false)} title="Edit donation">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <Field id="de-donorName" name="donorName" label="Donor name" defaultValue={donation.donorName} required />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="de-donorType" className="block text-sm font-medium text-foreground mb-1.5">
                Donor type
              </label>
              <select
                id="de-donorType"
                name="donorType"
                required
                defaultValue={donation.donorType}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
              >
                {DONOR_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Field id="de-donorContact" name="donorContact" label="Donor contact" defaultValue={donation.donorContact ?? ""} />
          </div>

          <div>
            <label htmlFor="de-donationType" className="block text-sm font-medium text-foreground mb-1.5">
              Donation type
            </label>
            <select
              id="de-donationType"
              name="donationType"
              required
              value={donationType}
              onChange={(e) => setDonationType(e.target.value)}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              {DONATION_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {donationType === "IN_KIND" ? (
            <div>
              <label htmlFor="de-inKind" className="block text-sm font-medium text-foreground mb-1.5">
                Description of goods/equipment
              </label>
              <textarea
                id="de-inKind"
                name="inKindDescription"
                rows={2}
                required
                defaultValue={donation.inKindDescription ?? ""}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          ) : (
            <Field
              id="de-amount"
              name="amount"
              label="Amount (₦)"
              type="number"
              required
              defaultValue={donation.amount?.toString() ?? ""}
            />
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="de-purpose" name="purpose" label="Purpose / designation" defaultValue={donation.purpose ?? ""} />
            <Field id="de-receiptNumber" name="receiptNumber" label="Receipt number" defaultValue={donation.receiptNumber ?? ""} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              id="de-donatedAt"
              name="donatedAt"
              label="Date received"
              type="date"
              required
              defaultValue={toDateInputValue(donation.donatedAt)}
            />
            <div>
              <label htmlFor="de-receivedById" className="block text-sm font-medium text-foreground mb-1.5">
                Received by
              </label>
              <select
                id="de-receivedById"
                name="receivedById"
                required
                defaultValue={donation.receivedById}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="de-notes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              id="de-notes"
              name="notes"
              rows={2}
              defaultValue={donation.notes ?? ""}
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
