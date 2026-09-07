"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Lets a signed-in user fix their own display name — added specifically
 * because the topbar shows name + role side by side, and if an admin
 * account was bootstrapped with its role typed in as the name (e.g. via
 * `scripts/create-admin.ts ... "Super Admin"`), both end up reading
 * "Super Admin / Super Admin". Rather than only fixing the bootstrap
 * script, this gives anyone a way to correct it themselves without
 * re-running a script or asking a developer.
 */
export function ProfileNameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: updateError } = await authClient.updateUser({ name });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message ?? "Could not update your name.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-muted">Name</span>
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{currentName}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted hover:text-brand"
            aria-label="Edit your name"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <label htmlFor="profile-name" className="block text-sm font-medium text-foreground">
        Your name
      </label>
      <div className="flex gap-2">
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none"
        />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
