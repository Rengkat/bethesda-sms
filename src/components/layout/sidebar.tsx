"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { BrandLogo } from "./brand-logo";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

/**
 * Persistent desktop sidebar. Hidden below `lg`; MobileNav takes over there.
 * A real <nav> landmark with visible text labels next to every icon —
 * icon-only navigation is not acceptable for this app's users.
 */
export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role as (typeof item.roles)[number])));

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-brand-navy text-white">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <BrandLogo variant="dark" />
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
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
          onClick={() => authClient.signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
