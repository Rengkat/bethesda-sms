/**
 * Creates the first Super Admin account. There's no public sign-up route
 * in the real app (see src/lib/auth.ts — disableSignUp: true), so this
 * script builds its own one-off Better Auth instance — same database,
 * same password hashing, just with sign-up temporarily allowed — purely
 * to bootstrap that first account. It never touches src/lib/auth.ts, so
 * the real app still has no public sign-up after this runs.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts admin@example.com "YourPassword123!" "Your Name"
 *
 * Run it once. After that, sign in at /login. To create more staff
 * logins later, re-run this with a different email, or build an
 * HR-facing "create account" flow reusing the same pattern.
 */
import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../src/lib/prisma";

const bootstrapAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    disableSignUp: false, // only in this bootstrap instance, not the real app
  },
});

async function main() {
  const [email, password, name] = process.argv.slice(2);

  if (!email || !password) {
    console.error(
      'Usage: npx tsx scripts/create-admin.ts admin@example.com "YourPassword123!" "Your Name"',
    );
    process.exit(1);
  }

  // The third argument is the PERSON's name, shown next to their role
  // everywhere in the UI (topbar, audit logs, "issued by" on queries).
  // Typing the role itself here ("Super Admin", "Admin", "HR Admin") is a
  // common mistake that makes the topbar read e.g. "Super Admin / Super
  // Admin" — caught here so it's fixed before the account exists, not
  // after. (It can also be changed anytime from the app at /profile.)
  const ROLE_LIKE_NAMES = ["super admin", "admin", "hr admin", "supervisor", "teacher", "house parent", "support staff"];
  if (name && ROLE_LIKE_NAMES.includes(name.trim().toLowerCase())) {
    console.error(
      `"${name}" looks like a role, not a person's name. Pass the actual admin's name instead, e.g.:\n` +
        `  npx tsx scripts/create-admin.ts ${email} "${password}" "Adaeze Okafor"`,
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "SUPER_ADMIN" } });
    console.log(`An account with this email already existed — promoted it to SUPER_ADMIN: ${email}`);
    return;
  }

  const result = await bootstrapAuth.api.signUpEmail({
    body: { email, password, name: name ?? "Admin" },
  });

  if (!result?.user) {
    console.error("Could not create the account. Response:", result);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "SUPER_ADMIN" },
  });

  console.log(`Created Super Admin: ${email}`);
  console.log("You can now sign in at /login with this email and password.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
