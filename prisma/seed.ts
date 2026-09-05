import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Seed-only auth instance: same DB + user schema as the real app,
// but with sign-up enabled so we can create the first admin.
// Never import/export this — it's local to this script.
const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "SUPPORT_STAFF" },
      staffId: { type: "string", required: false },
    },
  },
});

async function main() {
  const departments = ["Academics", "Boarding/House", "Admin", "Kitchen", "Security", "Grounds"];

  for (const name of departments) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }

  await prisma.shiftType.upsert({
    where: { id: "school-day" },
    update: {},
    create: {
      id: "school-day",
      name: "School Day",
      startTime: "07:30",
      endTime: "15:30",
      gracePeriodMinutes: 10,
    },
  });

  await prisma.shiftType.upsert({
    where: { id: "boarding-night" },
    update: {},
    create: {
      id: "boarding-night",
      name: "Boarding Night",
      startTime: "18:00",
      endTime: "06:00",
      gracePeriodMinutes: 15,
    },
  });

  await prisma.leaveType.upsert({
    where: { id: "annual" },
    update: {},
    create: { id: "annual", name: "Annual", defaultDaysPerYear: 21 },
  });
  await prisma.leaveType.upsert({
    where: { id: "sick" },
    update: {},
    create: { id: "sick", name: "Sick", defaultDaysPerYear: 10 },
  });
  await prisma.leaveType.upsert({
    where: { id: "casual" },
    update: {},
    create: { id: "casual", name: "Casual", defaultDaysPerYear: 6 },
  });

  // --- Seed Super Admin ---
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@bethesda.local";
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const ADMIN_NAME = "Super Admin";

  const adminDept = await prisma.department.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin" },
  });

  const adminStaff = await prisma.staff.upsert({
    where: { staffCode: "ADMIN-001" },
    update: {},
    create: {
      staffCode: "ADMIN-001",
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      category: "NON_TEACHING",
      departmentId: adminDept.id,
      employmentType: "FULL_TIME",
      dateHired: new Date(),
      active: true,
    },
  });

  const existingUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (!existingUser) {
    await seedAuth.api.signUpEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME },
    });

    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { emailVerified: true, role: "SUPER_ADMIN", staffId: adminStaff.id },
    });

    console.log(`Super Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Super Admin already exists: ${ADMIN_EMAIL}`);
  }

  console.log("Seed complete: departments, shift types, leave types, super admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
