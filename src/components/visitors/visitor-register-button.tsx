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

export function VisitorRegisterButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [madeDonation, setMadeDonation] = useState(false);
  const [donationType, setDonationType] = useState<string>("CASH");
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
    setMadeDonation(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Register visitor
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Register a visitor" size="lg">
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
            <label htmlFor="v-category" className="block text-left text-sm font-medium text-foreground mb-1.5">
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
            <label htmlFor="v-notes" className="block text-left text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              id="v-notes"
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground border-t border-border pt-4">
            <input
              type="checkbox"
              name="madeDonation"
              checked={madeDonation}
              onChange={(e) => setMadeDonation(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            This visitor is also making a donation
          </label>

          {madeDonation && (
            <div className="space-y-4 rounded-xl bg-gray-50 p-4">
              <div>
                <label htmlFor="v-donorType" className="block text-left text-sm font-medium text-foreground mb-1.5">
                  Donor type
                </label>
                <select
                  id="v-donorType"
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
                <label htmlFor="v-donationType" className="block text-left text-sm font-medium text-foreground mb-1.5">
                  Donation type
                </label>
                <select
                  id="v-donationType"
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
                  <label htmlFor="v-inKind" className="block text-left text-sm font-medium text-foreground mb-1.5">
                    Description of goods/equipment
                  </label>
                  <textarea
                    id="v-inKind"
                    name="inKindDescription"
                    rows={2}
                    placeholder="e.g. 40 bags of rice, 2 wheelchairs"
                    className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
                  />
                </div>
              ) : (
                <Field id="v-amount" name="amount" label="Amount (₦)" type="number" />
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="v-purpose" name="purpose" label="Purpose / designation" placeholder="e.g. Feeding programme" />
                <Field id="v-receiptNumber" name="receiptNumber" label="Receipt number" />
              </div>

              <p className="text-xs text-muted">
                This will also appear on the Donations page — logged here just saves entering the
                same person&apos;s details twice.
              </p>
            </div>
          )}

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
      <label htmlFor={id} className="block text-left text-sm font-medium text-foreground mb-1.5">
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
