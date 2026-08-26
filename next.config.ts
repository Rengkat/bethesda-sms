import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` (used by the Prisma driver adapter) has optional native/conditional
  // requires that trip up bundling if Next tries to bundle it into server
  // chunks — keep it as a real Node require instead.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
