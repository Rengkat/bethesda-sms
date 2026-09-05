"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
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

export function DonationRegisterButton({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [donationType, setDonationType] = useState<string>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not record this donation.");
      return;
    }

    setOpen(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <HandCoins className="h-4 w-4" aria-hidden="true" />
        Record donation
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Record a donation">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <Field id="d-donorName" name="donorName" label="Donor name" required />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-donorType" className="block text-sm font-medium text-foreground mb-1.5">
                Donor type
              </label>
              <select
                id="d-donorType"
                name="donorType"
                required
                defaultValue="INDIVIDUAL"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
              >
                {DONOR_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Field id="d-donorContact" name="donorContact" label="Donor contact" placeholder="Phone or email" />
          </div>

          <div>
            <label htmlFor="d-donationType" className="block text-sm font-medium text-foreground mb-1.5">
              Donation type
            </label>
            <select
              id="d-donationType"
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
              <label htmlFor="d-inKind" className="block text-sm font-medium text-foreground mb-1.5">
                Description of goods/equipment
              </label>
              <textarea
                id="d-inKind"
                name="inKindDescription"
                rows={2}
                required
                placeholder="e.g. 40 bags of rice, 2 wheelchairs"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          ) : (
            <Field id="d-amount" name="amount" label="Amount (₦)" type="number" required />
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="d-purpose" name="purpose" label="Purpose / designation" placeholder="e.g. Feeding programme" />
            <Field id="d-receiptNumber" name="receiptNumber" label="Receipt number" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="d-donatedAt" name="donatedAt" label="Date received" type="date" required />
            <div>
              <label htmlFor="d-receivedById" className="block text-sm font-medium text-foreground mb-1.5">
                Received by
              </label>
              <select
                id="d-receivedById"
                name="receivedById"
                required
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
              >
                <option value="">Select staff member</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="d-notes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              id="d-notes"
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
              {isSubmitting ? "Saving…" : "Record donation"}
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
