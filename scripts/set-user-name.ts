/**
 * Directly sets a user's display name — a guaranteed fallback for fixing
 * the "topbar shows the role as the name" issue (e.g. an account
 * bootstrapped with `create-admin.ts ... "Super Admin"`) if the in-app fix
 * on /profile (click the pencil next to "Name") isn't available to you for
 * some reason (locked out, no other admin yet, etc). This writes straight
 * to the User table with Prisma — no Better Auth session/auth flow
 * involved, since a name is just a plain field, not something that needs
 * password hashing or session handling.
 *
 * Usage:
 *   npx tsx scripts/set-user-name.ts admin@example.com "Adaeze Okafor"
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [email, name] = process.argv.slice(2);

  if (!email || !name) {
    console.error('Usage: npx tsx scripts/set-user-name.ts admin@example.com "Adaeze Okafor"');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  await prisma.user.update({ where: { email }, data: { name } });
  console.log(`Updated ${email}'s name to "${name}". Sign out and back in (or just refresh) to see it.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
