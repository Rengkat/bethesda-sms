"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Device, Staff } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";

export function ManualEntryForm({ staff, devices }: { staff: Staff[]; devices: Device[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch("/api/attendance/manual-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not save this entry.");
      return;
    }

    router.push("/attendance");
  }

  return (
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
        <select id="staffId" name="staffId" required className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none">
          <option value="">Select staff member</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode})</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="deviceId" className="block text-sm font-medium text-foreground mb-1.5">
          Device / location
        </label>
        <select id="deviceId" name="deviceId" required className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none">
          <option value="">Select device</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1.5">
            Type
          </label>
          <select id="type" name="type" required className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm bg-white focus-visible:outline-none">
            <option value="CHECK_IN">Check in</option>
            <option value="CHECK_OUT">Check out</option>
          </select>
        </div>
        <div>
          <label htmlFor="timestamp" className="block text-sm font-medium text-foreground mb-1.5">
            Date &amp; time
          </label>
          <input
            id="timestamp"
            name="timestamp"
            type="datetime-local"
            required
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1.5">
          Reason for override <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          required
          rows={3}
          placeholder="e.g. Device offline during check-in, confirmed with supervisor"
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
