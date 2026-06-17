import dotenv from "dotenv";
import path from "path";
import { prisma } from "../lib/prisma";

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * This script ensures the multi-tenant architecture is correctly bootstrapped.
 * It verifies the default organization and ensures all core data is linked.
 */
async function bootstrap() {
  console.log("🚀 Starting Multi-Tenant Bootstrap...");

  // 1. Ensure Default Organization exists with standard ID
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: "farmiclegrow" },
    update: {
      name: "FarmicleGrow Exporters",
      status: "ACTIVE",
    },
    create: {
      id: "org_default", // Matches the SQL migration default
      name: "FarmicleGrow Exporters",
      slug: "farmiclegrow",
      status: "ACTIVE",
      publicTraceEnabled: true,
      publicTracePolicy: {
        showFarmer: false,
        anonymizeFarmer: true,
        showCooperativeName: false,
        showCommunityName: false,
        showCertifications: false,
        showQuality: false,
        qualityPrecision: "SUMMARY",
        showLogistics: false,
        logisticsPrecision: "COARSE",
        showMedia: false,
        datePrecision: "MONTH",
        showLocation: true,
        locationPrecision: "REGION",
      },
    },
  });

  console.log(`✅ Default Organization confirmed: ${defaultOrg.name} (${defaultOrg.id})`);

  // 2. Ensure all users have an organizationId
  const userUpdate = await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id },
  });
  console.log(`✅ Updated ${userUpdate.count} users with default organization.`);

  // 3. Ensure all farmers have an organizationId
  // (In the schema it's required, so this is just a safety check for any manual DB entries)
  const farmerUpdate = await prisma.farmer.updateMany({
    where: { organizationId: { equals: "" } },
    data: { organizationId: defaultOrg.id },
  });
  console.log(`✅ Verified ${farmerUpdate.count} farmers linked to organization.`);

  // 4. Update Audit Logs
  const auditUpdate = await prisma.auditLog.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id },
  });
  console.log(`✅ Updated ${auditUpdate.count} audit logs.`);

  console.log("✨ Bootstrap Complete!");
}

bootstrap()
  .catch((e) => {
    console.error("❌ Bootstrap failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
