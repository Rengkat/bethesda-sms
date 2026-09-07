"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Department } from "@/generated/prisma/client";
import type { serializeStaffForClient } from "@/lib/serialize";
import { Button } from "@/components/ui/button";

const ROLES = [
  "SUPER_ADMIN",
  "HR_ADMIN",
  "SUPERVISOR",
  "TEACHER",
  "HOUSE_PARENT",
  "SUPPORT_STAFF",
] as const;

const CATEGORIES = ["TEACHING", "NON_TEACHING"] as const;
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "VOLUNTEER"] as const;
const GENDERS = ["MALE", "FEMALE"] as const;
const MARITAL_STATUSES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] as const;

function toDateInputValue(date: Date | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export function StaffForm({
  departments,
  canEditSalary = false,
  staff,
}: {
  departments: Department[];
  /** Passed from the server page based on the signed-in user's role — see
   * `staff:edit-salary` in permissions.ts. The API also re-checks this
   * server-side, so hiding the field here is a UX nicety, not the guard. */
  canEditSalary?: boolean;
  /** Present only when editing an existing staff member — switches the
   * form to PATCH /api/staff/[id] and pre-fills every field. Pass it
   * through serializeStaffForClient() first — Staff.currentSalary is a
   * Prisma Decimal and can't cross into a client component as-is. */
  staff?: ReturnType<typeof serializeStaffForClient>;
}) {
  const router = useRouter();
  const isEditing = Boolean(staff);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch(isEditing ? `/api/staff/${staff!.id}` : "/api/staff", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? `Could not ${isEditing ? "update" : "save"} this staff member.`);
      return;
    }

    const result = await res.json();
    router.push(`/staff/${isEditing ? staff!.id : result.id}`);
    router.refresh();
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
          <Field id="fullName" name="fullName" label="Full name" required defaultValue={staff?.fullName} />
          {isEditing ? (
            <Field
              id="staffCode"
              name="staffCode"
              label="Staff code"
              required
              defaultValue={staff?.staffCode}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Staff code</label>
              <p className="text-sm text-muted px-3.5 py-2.5 rounded-lg bg-gray-50 border border-border">
                Generated automatically — BHB-ST-#### (sighted) or BHB-VI-#### (visually impaired),
                based on the checkbox below.
              </p>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="email" name="email" label="Email" type="email" defaultValue={staff?.email ?? ""} />
          <Field id="phone" name="phone" label="Phone" type="tel" defaultValue={staff?.phone ?? ""} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground mb-1">Employment</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField id="departmentId" name="departmentId" label="Department" required defaultValue={staff?.departmentId}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </SelectField>

          <SelectField id="role" name="role" label="Role" required defaultValue={staff?.role}>
            <option value="">Select role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{formatLabel(r)}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField id="category" name="category" label="Staff category" required defaultValue={staff?.category ?? ""}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{formatLabel(c)}</option>
            ))}
          </SelectField>

          <SelectField id="employmentType" name="employmentType" label="Employment type" required defaultValue={staff?.employmentType}>
            <option value="">Select type</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{formatLabel(t)}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="dateHired" name="dateHired" label="Date hired" type="date" required defaultValue={toDateInputValue(staff?.dateHired)} />
          {isEditing && (
            <Field id="dateExited" name="dateExited" label="Date exited (if applicable)" type="date" defaultValue={toDateInputValue(staff?.dateExited)} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="isVisuallyImpaired"
              defaultChecked={staff?.isVisuallyImpaired}
              className="h-4 w-4 rounded border-border"
            />
            Staff member is visually impaired (informs UI/communication preferences only)
          </label>
          {isEditing && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="active"
                defaultChecked={staff?.active ?? true}
                className="h-4 w-4 rounded border-border"
              />
              Active (unchecking marks them inactive, e.g. on exit)
            </label>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground mb-1">Personal details</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="dateOfBirth" name="dateOfBirth" label="Date of birth" type="date" defaultValue={toDateInputValue(staff?.dateOfBirth)} />
          <SelectField id="gender" name="gender" label="Gender" defaultValue={staff?.gender ?? ""}>
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{formatLabel(g)}</option>
            ))}
          </SelectField>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField id="maritalStatus" name="maritalStatus" label="Marital status" defaultValue={staff?.maritalStatus ?? ""}>
            <option value="">Select status</option>
            {MARITAL_STATUSES.map((m) => (
              <option key={m} value={m}>{formatLabel(m)}</option>
            ))}
          </SelectField>
          <Field id="nationality" name="nationality" label="Nationality" defaultValue={staff?.nationality ?? ""} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="stateOfOrigin" name="stateOfOrigin" label="State of origin" defaultValue={staff?.stateOfOrigin ?? ""} />
          <Field id="homeAddress" name="homeAddress" label="Home address" defaultValue={staff?.homeAddress ?? ""} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground mb-1">Next of kin</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="nextOfKinName" name="nextOfKinName" label="Full name" defaultValue={staff?.nextOfKinName ?? ""} />
          <Field id="nextOfKinPhone" name="nextOfKinPhone" label="Phone" type="tel" defaultValue={staff?.nextOfKinPhone ?? ""} />
        </div>
        <Field
          id="nextOfKinRelationship"
          name="nextOfKinRelationship"
          label="Relationship"
          placeholder="Spouse, sibling, parent…"
          defaultValue={staff?.nextOfKinRelationship ?? ""}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground mb-1">Bank details</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="bankName" name="bankName" label="Bank name" defaultValue={staff?.bankName ?? ""} />
          <Field id="bankAccountName" name="bankAccountName" label="Account name" defaultValue={staff?.bankAccountName ?? ""} />
        </div>
        <Field
          id="bankAccountNumber"
          name="bankAccountNumber"
          label="Account number"
          inputMode="numeric"
          defaultValue={staff?.bankAccountNumber ?? ""}
        />

        {canEditSalary && (
          <Field
            id="currentSalary"
            name="currentSalary"
            label="Current monthly salary (₦)"
            type="number"
            placeholder="e.g. 150000"
            defaultValue={staff?.currentSalary?.toString() ?? ""}
          />
        )}
      </fieldset>

      {!isEditing && (
        <p className="text-sm text-muted">
          Qualifications and documents can be added once this staff record is created.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Save staff member"}
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
  inputMode,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
        placeholder={placeholder}
        inputMode={inputMode}
        defaultValue={defaultValue}
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
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
