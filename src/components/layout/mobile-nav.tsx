"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { X, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { BrandLogo } from "./brand-logo";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useSignOut } from "@/hooks/use-sign-out";

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const isOpen = useUIStore((s) => s.isMobileNavOpen);
  const close = useUIStore((s) => s.closeMobileNav);
  const panelRef = useRef<HTMLDivElement>(null);
  const signOut = useSignOut();

  useFocusTrap(panelRef, isOpen, close);

  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role as (typeof item.roles)[number])));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden print:hidden">
      {/* Overlay — click to dismiss */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand-navy text-white flex flex-col shadow-xl"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <BrandLogo variant="dark" />
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-brand-blue text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
