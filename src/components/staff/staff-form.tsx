"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Department } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";

const ROLES = [
  "SUPER_ADMIN",
  "HR_ADMIN",
  "SUPERVISOR",
  "TEACHER",
  "HOUSE_PARENT",
  "SUPPORT_STAFF",
] as const;

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "VOLUNTEER"] as const;

export function StaffForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not save this staff member.");
      return;
    }

    const created = await res.json();
    router.push(`/staff/${created.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground mb-1">Identity</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="fullName" name="fullName" label="Full name" required />
          <Field id="staffCode" name="staffCode" label="Staff code" placeholder="BHB-0042" required />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="email" name="email" label="Email" type="email" />
          <Field id="phone" name="phone" label="Phone" type="tel" />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground mb-1">Employment</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField id="departmentId" name="departmentId" label="Department" required>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </SelectField>

          <SelectField id="role" name="role" label="Role" required>
            <option value="">Select role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{formatLabel(r)}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField id="employmentType" name="employmentType" label="Employment type" required>
            <option value="">Select type</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{formatLabel(t)}</option>
            ))}
          </SelectField>
          <Field id="dateHired" name="dateHired" label="Date hired" type="date" required />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="isVisuallyImpaired" className="h-4 w-4 rounded border-border" />
          Staff member is visually impaired (informs UI/communication preferences only)
        </label>
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save staff member"}
        </Button>
      </div>
    </form>
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

function SelectField({
  id,
  name,
  label,
  required,
  children,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
