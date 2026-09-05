import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetOTP } from "@/lib/notifications";

/**
 * Better Auth configuration.
 *
 * Note: the original system-structure brief specified Lucia Auth, but Lucia
 * was deprecated by its maintainer in 2025 (no v4, npm package flagged
 * deprecated). Better Auth is the actively maintained, Prisma-friendly
 * successor most guides now recommend for new TypeScript projects, so the
 * schema and this config target it instead. Session/user shape is close
 * enough to Lucia's that swapping libraries later is a small migration if
 * you ever need to.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Staff accounts are created by an HR/Super Admin, not self-service —
    // there is no public sign-up route in this app.
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "SUPPORT_STAFF",
      },
      staffId: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [
    // Admins/HR forgetting their password is the whole reason this exists —
    // a 6-digit code emailed to them, rather than a reset link, since it's
    // simpler to key in on a shared front-desk computer and doesn't depend
    // on the email client rendering a clickable link correctly.
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 5, // 5 minutes
      allowedAttempts: 3,
      storeOTP: "hashed", // the code emailed to the user is unaffected — only what's persisted in Verification is hashed
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "forget-password") {
          await sendPasswordResetOTP({ email, otp });
        }
        // "sign-in" / "email-verification" / "change-email" OTPs aren't
        // used anywhere in this app (no self-service sign-up, no email
        // self-change flow) — nothing to send for those types.
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
