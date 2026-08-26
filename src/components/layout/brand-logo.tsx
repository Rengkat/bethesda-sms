import Link from "next/link";

export function BrandLogo({ variant = "light" }: { variant?: "light" | "dark" }) {
  const textColor = variant === "dark" ? "text-white" : "text-brand-navy";
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 shrink-0"
      aria-label="Bethesda Staff Management, go to dashboard"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-white font-bold text-sm"
      >
        BHB
      </span>
      <span className={`leading-tight ${textColor}`}>
        <span className="block text-sm font-bold">Bethesda</span>
        <span className="block text-[11px] font-medium opacity-70">
          Staff Management
        </span>
      </span>
    </Link>
  );
}
