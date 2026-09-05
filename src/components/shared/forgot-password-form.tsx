"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type Step = "request" | "reset";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const { error: requestError } = await authClient.emailOtp.requestPasswordReset({ email });

    setIsSubmitting(false);

    // Deliberately the same message whether or not the email is on file —
    // confirming/denying an account exists from this form is an account
    // enumeration risk, so this page never distinguishes the two.
    if (requestError) {
      setError(requestError.message ?? "Could not send a reset code. Try again.");
      return;
    }

    setInfo("If that email has an account, a 6-digit code has been sent to it.");
    setStep("reset");
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    const { error: requestError } = await authClient.emailOtp.requestPasswordReset({ email });
    if (requestError) {
      setError(requestError.message ?? "Could not resend the code.");
      return;
    }
    setInfo("A new code has been sent.");
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? "That code didn't work — check it and try again.");
      return;
    }

    router.push("/login?reset=success");
  }

  if (step === "request") {
    return (
      <form onSubmit={handleRequestCode} className="mt-6 space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="fp-email" className="block text-sm font-medium text-foreground mb-1.5">
            Email address
          </label>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleResetPassword} className="mt-6 space-y-4" noValidate>
      {error && (
        <div role="alert" className="rounded-lg bg-danger-bg text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}
      {info && (
        <div role="status" className="rounded-lg bg-green-50 text-success text-sm px-4 py-3">
          {info}
        </div>
      )}

      <p className="text-sm text-muted">
        Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>{" "}
        and choose a new password. The code expires in 5 minutes.
      </p>

      <div>
        <label htmlFor="fp-otp" className="block text-sm font-medium text-foreground mb-1.5">
          6-digit code
        </label>
        <input
          id="fp-otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm tracking-widest focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor="fp-password" className="block text-sm font-medium text-foreground mb-1.5">
          New password
        </label>
        <input
          id="fp-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
        />
      </div>

      <div>
        <label htmlFor="fp-confirm" className="block text-sm font-medium text-foreground mb-1.5">
          Confirm new password
        </label>
        <input
          id="fp-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus-visible:outline-none"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Resetting…" : "Reset password"}
      </Button>

      <button
        type="button"
        onClick={handleResend}
        className="w-full text-center text-sm text-brand underline underline-offset-2"
      >
        Didn&apos;t get a code? Resend
      </button>
    </form>
  );
}
