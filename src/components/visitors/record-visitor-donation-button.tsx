"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
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

export function RecordVisitorDonationButton({ visitorId }: { visitorId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [donationType, setDonationType] = useState("CASH");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch(`/api/visitors/${visitorId}/donations`, {
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
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
        Record a donation
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Record a donation" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="rvd-donorType" className="block text-left text-sm font-medium text-foreground mb-1.5">
              Donor type
            </label>
            <select
              id="rvd-donorType"
              name="donorType"
              defaultValue="INDIVIDUAL"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              {DONOR_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rvd-donationType" className="block text-left text-sm font-medium text-foreground mb-1.5">
              Donation type
            </label>
            <select
              id="rvd-donationType"
              name="donationType"
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
              <label htmlFor="rvd-inKind" className="block text-left text-sm font-medium text-foreground mb-1.5">
                Description of goods/equipment
              </label>
              <textarea
                id="rvd-inKind"
                name="inKindDescription"
                rows={2}
                placeholder="e.g. 40 bags of rice, 2 wheelchairs"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="rvd-amount" className="block text-left text-sm font-medium text-foreground mb-1.5">
                Amount (₦)
              </label>
              <input
                id="rvd-amount"
                name="amount"
                type="number"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rvd-purpose" className="block text-left text-sm font-medium text-foreground mb-1.5">
                Purpose / designation
              </label>
              <input
                id="rvd-purpose"
                name="purpose"
                placeholder="e.g. Feeding programme"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="rvd-receiptNumber" className="block text-left text-sm font-medium text-foreground mb-1.5">
                Receipt number
              </label>
              <input
                id="rvd-receiptNumber"
                name="receiptNumber"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
              />
            </div>
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
