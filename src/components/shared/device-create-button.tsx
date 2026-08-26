"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function DeviceCreateButton() {
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

    const res = await fetch("/api/settings/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not register this device.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New device
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Register device">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="device-name" className="block text-sm font-medium text-foreground mb-1.5">
              Name
            </label>
            <input
              id="device-name"
              name="name"
              type="text"
              required
              placeholder="e.g. Main Entrance K40"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1.5">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              placeholder="e.g. Main entrance, ground floor"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
          </div>
          <div>
            <label htmlFor="localIp" className="block text-sm font-medium text-foreground mb-1.5">
              Local IP address
            </label>
            <input
              id="localIp"
              name="localIp"
              type="text"
              required
              placeholder="192.168.1.201"
              pattern="^(\d{1,3}\.){3}\d{1,3}$"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              After saving, copy this device&apos;s ID into the Raspberry Pi
              bridge&apos;s <code className="px-1 py-0.5 rounded bg-gray-100">.env</code> as{" "}
              <code className="px-1 py-0.5 rounded bg-gray-100">DEVICE_ID</code>.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Register device"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
