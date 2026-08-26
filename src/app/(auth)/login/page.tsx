import { LoginForm } from "@/components/shared/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel — hidden on small screens to keep the form the focus */}
      <div className="hidden lg:flex flex-col justify-between bg-brand-lavender px-12 py-10">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue text-white font-bold text-sm"
          >
            BHB
          </span>
          <span className="font-bold text-brand-navy">Bethesda Home &amp; School for the Blind</span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-3xl font-bold text-brand-navy leading-tight">
            Staff Management System
          </h1>
          <p className="mt-3 text-brand-navy/70">
            Records, biometric attendance, shifts, leave, and reporting for
            Bethesda&apos;s teaching, boarding, and support staff.
          </p>
        </div>

        <p className="text-xs text-brand-navy/60">
          20 Odejayi Crescent, Idi Oro, Lagos State
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
          <p className="mt-1 text-muted text-sm">
            Use the email and password issued by HR.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
