import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = "Bethesda Staff Management <no-reply@bethesdahomefortheblind.com>";

/**
 * All send functions below no-op (log + return) when RESEND_API_KEY isn't
 * set, rather than throwing — attendance sync and leave decisions must
 * keep working even before notifications are configured.
 */

export async function sendPasswordResetOTP(input: { email: string; otp: string }) {
  if (!resend) {
    // Unlike the other notifications here, a missing key on this one means
    // someone literally cannot get back into their account via this flow —
    // worth being loud about. In development only, the code itself is
    // logged so the flow is testable without Resend configured; in
    // production we never write an OTP to logs, since logs are typically
    // less tightly access-controlled than email.
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[notifications] RESEND_API_KEY not set — password reset OTP for ${input.email} could NOT be delivered. Set RESEND_API_KEY so admins can actually recover their accounts.`,
      );
    } else {
      console.warn(
        `[notifications] RESEND_API_KEY not set — password reset OTP for ${input.email}: ${input.otp} (dev-only log; this code is never logged in production).`,
      );
    }
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.email,
    subject: "Your password reset code",
    text: `Your Bethesda SMS password reset code is ${input.otp}. It expires in 5 minutes. If you didn't request this, you can ignore this email — your password won't change unless this code is used.`,
  });
}

export async function sendLateCheckInAlert(input: {
  supervisorEmail: string;
  staffName: string;
  minutesLate: number;
  shiftName: string;
}) {
  if (!resend) {
    console.warn("[notifications] RESEND_API_KEY not set — skipping late check-in alert.");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.supervisorEmail,
    subject: `Late check-in: ${input.staffName}`,
    text: `${input.staffName} checked in ${input.minutesLate} minutes late for their ${input.shiftName} shift today.`,
  });
}

export async function sendLeaveDecisionNotification(input: {
  staffEmail: string;
  staffName: string;
  leaveTypeName: string;
  status: "APPROVED" | "REJECTED";
  startDate: Date;
  endDate: Date;
}) {
  if (!resend) {
    console.warn("[notifications] RESEND_API_KEY not set — skipping leave decision email.");
    return;
  }

  const verb = input.status === "APPROVED" ? "approved" : "declined";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.staffEmail,
    subject: `Your ${input.leaveTypeName} leave request was ${verb}`,
    text: `Hi ${input.staffName}, your ${input.leaveTypeName} leave request (${input.startDate.toDateString()} – ${input.endDate.toDateString()}) was ${verb}.`,
  });
}

export async function sendLeaveRequestSubmittedNotification(input: {
  approverEmail: string;
  staffName: string;
  leaveTypeName: string;
}) {
  if (!resend) {
    console.warn("[notifications] RESEND_API_KEY not set — skipping leave submitted email.");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.approverEmail,
    subject: `New leave request from ${input.staffName}`,
    text: `${input.staffName} submitted a ${input.leaveTypeName} leave request awaiting your decision.`,
  });
}
