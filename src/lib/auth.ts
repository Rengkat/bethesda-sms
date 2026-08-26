import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

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
});

export type Session = typeof auth.$Infer.Session;
