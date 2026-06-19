import "./env";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

function readOptionalSeedEnv(name: string) {
  return process.env[name]?.trim();
}

async function seedRoles() {
  const roles = [
    { key: "super_admin", name: "Super Administrator" },
    { key: "admin", name: "Administrator" },
    { key: "agronomist", name: "Agronomist" },
    { key: "ops", name: "Operations" },
    { key: "farmer", name: "Farmer" },
    { key: "buyer", name: "Buyer" },
  ];

  await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { key: role.key },
        update: { name: role.name },
        create: role,
      }),
    ),
  );
}

async function seedBillingPlans() {
  const plans = [
    {
      key: "STARTER",
      name: "Starter",
      priceCents: 0,
      currency: "USD",
      interval: "month",
      usersLimit: 5,
      farmersLimit: 100,
      batchesLimit: 50,
      isActive: true,
    },
    {
      key: "PROFESSIONAL",
      name: "Professional",
      priceCents: 29900,
      currency: "USD",
      interval: "month",
      usersLimit: 20,
      farmersLimit: 1000,
      batchesLimit: 500,
      isActive: true,
    },
    {
      key: "ENTERPRISE",
      name: "Enterprise",
      priceCents: 0,
      currency: "USD",
      interval: "month",
      usersLimit: 100,
      farmersLimit: 10000,
      batchesLimit: 5000,
      isActive: true,
    },
    {
      key: "GOVERNMENT",
      name: "Government",
      priceCents: 0,
      currency: "USD",
      interval: "month",
      usersLimit: 1000,
      farmersLimit: 100000,
      batchesLimit: 50000,
      isActive: true,
    },
  ];

  await Promise.all(
    plans.map((plan) =>
      prisma.billingPlan.upsert({
        where: { key: plan.key },
        update: plan,
        create: plan,
      }),
    ),
  );
}

async function seedDefaultOrganization() {
  return prisma.organization.upsert({
    where: { slug: "farmiclegrow" },
    update: {
      name: "FarmicleGrow Exporters",
      status: "ACTIVE",
    },
    create: {
      name: "FarmicleGrow Exporters",
      slug: "farmiclegrow",
      status: "ACTIVE",
    },
  });
}

async function seedAdmin(orgId: string) {
  const adminEmail = readOptionalSeedEnv("SEED_ADMIN_EMAIL");
  const adminPassword = readOptionalSeedEnv("SEED_ADMIN_PASSWORD");
  if (!adminEmail || !adminPassword) {
    console.log("Skipping admin seed (SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set)");
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: "FarmicleGrow Admin",
      passwordHash,
      isActive: true,
      organizationId: orgId,
    },
    create: {
      email: adminEmail,
      fullName: "FarmicleGrow Admin",
      passwordHash,
      isActive: true,
      organizationId: orgId,
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "admin" } });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log("Admin user seeded successfully");
}

async function seedAgronomist(orgId: string) {
  const agronomistEmail = readOptionalSeedEnv("SEED_AGRONOMIST_EMAIL");
  const agronomistPassword = readOptionalSeedEnv("SEED_AGRONOMIST_PASSWORD");
  if (!agronomistEmail || !agronomistPassword) {
    console.log("Skipping agronomist seed (SEED_AGRONOMIST_EMAIL or SEED_AGRONOMIST_PASSWORD not set)");
    return;
  }
  const passwordHash = await hashPassword(agronomistPassword);

  const user = await prisma.user.upsert({
    where: { email: agronomistEmail },
    update: {
      fullName: "Lead Agronomist",
      passwordHash,
      isActive: true,
      organizationId: orgId,
    },
    create: {
      email: agronomistEmail,
      fullName: "Lead Agronomist",
      passwordHash,
      isActive: true,
      organizationId: orgId,
    },
  });

  const role = await prisma.role.findUniqueOrThrow({ where: { key: "agronomist" } });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  console.log("Agronomist user seeded successfully");
}

async function seedOpsUser(orgId: string) {
  const opsEmail = readOptionalSeedEnv("SEED_OPS_EMAIL");
  const opsPassword = readOptionalSeedEnv("SEED_OPS_PASSWORD");
  if (!opsEmail || !opsPassword) {
    console.log("Skipping ops seed (SEED_OPS_EMAIL or SEED_OPS_PASSWORD not set)");
    return;
  }
  const passwordHash = await hashPassword(opsPassword);

  const user = await prisma.user.upsert({
    where: { email: opsEmail },
    update: {
      fullName: "Ops Coordinator",
      passwordHash,
      isActive: true,
      organizationId: orgId,
    },
    create: {
      email: opsEmail,
      fullName: "Ops Coordinator",
      passwordHash,
      isActive: true,
      organizationId: orgId,
    },
  });

  const role = await prisma.role.findUniqueOrThrow({ where: { key: "ops" } });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  console.log("Ops user seeded successfully");
}

async function main() {
  await seedRoles();
  await seedBillingPlans();
  const defaultOrg = await seedDefaultOrganization();
  await seedAdmin(defaultOrg.id);
  await seedAgronomist(defaultOrg.id);
  await seedOpsUser(defaultOrg.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
