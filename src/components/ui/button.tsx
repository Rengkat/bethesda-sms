import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// Solid, slightly raised buttons — a flat/borderless look reads as inert on
// a form-heavy internal tool, especially to less tech-fluent front-desk
// staff. A shadow + hover/active lift makes "this is clickable" obvious
// without needing to hover first to find out.
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-blue text-white shadow-sm shadow-brand-blue/30 hover:bg-brand-blue-dark hover:shadow-md active:shadow-sm active:translate-y-px disabled:bg-brand-blue/50 disabled:shadow-none",
  secondary:
    "bg-white text-foreground border border-border shadow-sm hover:bg-brand-blue-light hover:border-brand-blue/30 hover:shadow-md active:shadow-sm active:translate-y-px disabled:opacity-50 disabled:shadow-none",
  ghost:
    "bg-transparent text-foreground hover:bg-brand-blue-light disabled:opacity-50",
  danger:
    "bg-danger text-white shadow-sm shadow-danger/30 hover:bg-danger/90 hover:shadow-md active:shadow-sm active:translate-y-px disabled:bg-danger/50 disabled:shadow-none",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render the child element (e.g. a Next.js <Link>) with button styling
   * instead of wrapping it in a <button>, so links stay real anchors for
   * screen readers and keyboard navigation. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-all cursor-pointer",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
