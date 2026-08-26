"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LeaveDecisionForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "APPROVED" | "REJECTED") {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/leave/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not record this decision.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="pt-2 border-t border-border">
      {error && (
        <p role="alert" className="text-sm text-danger mb-3">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="danger" disabled={isSubmitting} onClick={() => decide("REJECTED")}>
          Reject
        </Button>
        <Button disabled={isSubmitting} onClick={() => decide("APPROVED")}>
          Approve
        </Button>
      </div>
    </div>
  );
}
