"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";

type Props = {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
};

export function SelfAttendanceCard({ hasCheckedIn, hasCheckedOut, checkInTime, checkOutTime }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const done = hasCheckedIn && hasCheckedOut;
  const nextAction = hasCheckedIn ? "CHECK_OUT" : "CHECK_IN";

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch("/api/attendance/self", { method: "POST" });
    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not log your attendance. Try again.");
      return;
    }

    router.refresh();
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-success mb-4"
        >
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="text-base font-semibold text-foreground">All done for today</h3>
        <p className="text-sm text-muted mt-1">
          Signed in at {checkInTime ? formatTime(checkInTime) : "—"} · Signed out at{" "}
          {checkOutTime ? formatTime(checkOutTime) : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      {error && (
        <div role="alert" className="w-full max-w-sm mb-4 rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}

      {hasCheckedIn && checkInTime && (
        <p className="text-sm text-muted mb-4">Signed in at {formatTime(checkInTime)}</p>
      )}

      <Button size="lg" onClick={handleClick} disabled={isSubmitting}>
        {nextAction === "CHECK_IN" ? (
          <LogIn className="h-5 w-5" aria-hidden="true" />
        ) : (
          <LogOut className="h-5 w-5" aria-hidden="true" />
        )}
        {isSubmitting
          ? "Recording…"
          : nextAction === "CHECK_IN"
          ? "Sign in for today"
          : "Sign out for today"}
      </Button>

      <p className="text-xs text-muted mt-3 max-w-xs">
        Use this only if you don&apos;t pass the biometric scanner at the entrance — it logs the
        same attendance record either way.
      </p>
    </div>
  );
}
