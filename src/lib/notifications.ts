import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = "Bethesda Staff Management <no-reply@bethesdahomefortheblind.com>";

/**
 * All send functions below no-op (log + return) when RESEND_API_KEY isn't
 * set, rather than throwing — attendance sync and leave decisions must
 * keep working even before notifications are configured.
 */

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
