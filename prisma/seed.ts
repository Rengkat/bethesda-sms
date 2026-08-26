import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const departments = [
    "Academics",
    "Boarding/House",
    "Admin",
    "Kitchen",
    "Security",
    "Grounds",
  ];

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

  console.log("Seed complete: departments, shift types, leave types.");
  console.log(
    "Create your first Super Admin account via `npx better-auth cli` or a one-off script — see README.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
