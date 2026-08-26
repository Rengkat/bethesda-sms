import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "departments", label: "Departments", href: "/settings/departments" },
  { id: "shift-types", label: "Shift types", href: "/settings/shift-types" },
  { id: "devices", label: "Devices", href: "/settings/devices" },
] as const;

export function SettingsTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Settings sections" className="border-b border-border">
      <ul className="flex gap-6">
        {TABS.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={active === tab.id ? "page" : undefined}
              className={cn(
                "inline-block py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                active === tab.id
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
