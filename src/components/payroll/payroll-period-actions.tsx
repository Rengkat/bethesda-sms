"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PayrollStatus } from "@/generated/prisma/client";

export function PayrollPeriodActions({ periodId, status }: { periodId: string; status: PayrollStatus }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "finalize" | "mark-paid") {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/payroll/${periodId}/${action}`, { method: "POST" });
    setIsSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not complete this action.");
      return;
    }
    router.refresh();
  }

  if (status === "PAID") return null;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-danger">{error}</span>}
      {status === "DRAFT" && (
        <Button size="sm" onClick={() => handleAction("finalize")} disabled={isSubmitting}>
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Finalize
        </Button>
      )}
      {status === "FINALIZED" && (
        <Button size="sm" onClick={() => handleAction("mark-paid")} disabled={isSubmitting}>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Mark as paid
        </Button>
      )}
    </div>
  );
}
