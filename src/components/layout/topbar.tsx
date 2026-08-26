"use client";

import { Menu } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { initials } from "@/lib/utils";

export function Topbar({
  userName,
  userRole,
}: {
  userName?: string;
  userRole?: string;
}) {
  const openMobileNav = useUIStore((s) => s.openMobileNav);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-3 border-b border-border bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={openMobileNav}
        className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-brand-blue-light"
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex-1" />

      {userName && (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue-dark text-sm font-semibold"
          >
            {initials(userName)}
          </span>
          <span className="hidden sm:block text-sm">
            <span className="block font-medium text-foreground">{userName}</span>
            <span className="block text-xs text-muted">{userRole}</span>
          </span>
        </div>
      )}
    </header>
  );
}
