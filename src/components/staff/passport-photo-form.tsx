"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export function PassportPhotoForm({
  staffId,
  fullName,
  currentPhotoUrl,
}: {
  staffId: string;
  fullName: string;
  currentPhotoUrl: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/staff/${staffId}/passport-photo`, {
      method: "POST",
      body: formData,
    });

    setIsUploading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not upload this photo.");
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  async function handleRemove() {
    setError(null);
    setIsRemoving(true);
    const res = await fetch(`/api/staff/${staffId}/passport-photo`, { method: "DELETE" });
    setIsRemoving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not remove this photo.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-start gap-4">
      {/* Preview — the exact same photo-or-initials fallback used on the
          staff detail page and the ID card, so what's previewed here is
          what actually shows up everywhere else. */}
      {currentPhotoUrl ? (
        <Image
          src={currentPhotoUrl}
          alt={`${fullName} passport photo`}
          width={200}
          height={200}
          className="h-16 w-16 rounded-full object-cover border border-border shrink-0"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2f3fe0] to-[#212ea8] text-white font-bold text-lg">
          {initials(fullName)}
        </div>
      )}

      <div className="flex-1 space-y-3">
        {error && (
          <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleUpload} className="space-y-3" noValidate>
          <div>
            <label htmlFor="passport-photo-file" className="block text-sm font-medium text-foreground mb-1.5">
              {currentPhotoUrl ? "Replace photo" : "Upload photo"}
            </label>
            <input
              id="passport-photo-file"
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-blue-dark file:cursor-pointer focus-visible:outline-none"
            />
            <p className="text-xs text-muted mt-1">JPG, PNG, or WEBP, up to 5MB.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={isUploading}>
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              {isUploading ? "Uploading…" : currentPhotoUrl ? "Replace" : "Upload"}
            </Button>
            {currentPhotoUrl && (
              <Button type="button" size="sm" variant="secondary" onClick={handleRemove} disabled={isRemoving}>
                <X className="h-4 w-4" aria-hidden="true" />
                {isRemoving ? "Removing…" : "Remove photo"}
              </Button>
            )}
          </div>
        </form>

        {!currentPhotoUrl && (
          <p className="text-xs text-muted">No photo on file — initials are shown instead, here and on the ID card.</p>
        )}
      </div>
    </div>
  );
}
