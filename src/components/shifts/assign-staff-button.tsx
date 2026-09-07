"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function AssignStaffButton({
  shiftTypeId,
  shiftTypeName,
  staff,
}: {
  shiftTypeId: string;
  shiftTypeName: string;
  // Deliberately a minimal shape, not the full Staff type — Staff carries
  // `currentSalary` (a Prisma Decimal), and Decimal instances can't cross
  // the server->client boundary as props (Next.js can only serialize
  // plain objects). Selecting just what the dropdown needs on the server
  // page avoids the crash instead of stringifying a field this component
  // never uses anyway.
  staff: { id: string; fullName: string; staffCode: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (selectedDays.length === 0) {
      setError("Select at least one day of the week.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/shifts/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId: formData.get("staffId"),
        shiftTypeId,
        daysOfWeek: selectedDays,
        effectiveFrom: formData.get("effectiveFrom"),
      }),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not create this assignment.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Assign staff
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Assign staff to ${shiftTypeName}`}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="staffId" className="block text-sm font-medium text-foreground mb-1.5">
              Staff member
            </label>
            <select
              id="staffId"
              name="staffId"
              required
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none"
            >
              <option value="">Select staff member</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode})</option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-foreground mb-1.5">
              Days of week
            </legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={selectedDays.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                    selectedDays.includes(day.value)
                      ? "bg-brand-blue text-white border-brand-blue"
                      : "bg-white text-foreground border-border hover:bg-brand-blue-light"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="effectiveFrom" className="block text-sm font-medium text-foreground mb-1.5">
              Effective from
            </label>
            <input
              id="effectiveFrom"
              name="effectiveFrom"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Assign"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
