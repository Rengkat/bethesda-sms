import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved the CLI's database connection out of schema.prisma and
 * into this file. This is read by `prisma generate` / `prisma migrate` /
 * `prisma db seed` — it is NOT what the running app uses at runtime (the
 * app builds its own adapter in src/lib/prisma.ts). Keep both pointed at
 * the same DATABASE_URL.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
