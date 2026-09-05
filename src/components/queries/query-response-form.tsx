"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function QueryResponseForm({ queryId }: { queryId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/queries/${queryId}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: formData.get("response") }),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not submit your response.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3" noValidate>
      {error && (
        <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}
      <label htmlFor={`response-${queryId}`} className="block text-sm font-medium text-foreground">
        Your response
      </label>
      <textarea
        id={`response-${queryId}`}
        name="response"
        rows={3}
        required
        placeholder="Explain your side — this becomes part of the record."
        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit response"}
        </Button>
      </div>
    </form>
  );
}
