"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VisitorCheckoutButton({ visitorId }: { visitorId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    const res = await fetch(`/api/visitors/${visitorId}/checkout`, { method: "PATCH" });
    setIsSubmitting(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button size="sm" variant="secondary" onClick={handleClick} disabled={isSubmitting}>
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      {isSubmitting ? "Signing out…" : "Sign out"}
    </Button>
  );
}
