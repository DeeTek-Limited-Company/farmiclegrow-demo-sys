import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

async function seedRoles() {
  const roles = [
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

async function seedAdmin() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password123";

  const passwordHash = await hashPassword(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: "FarmicleGrow Admin",
      passwordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      fullName: "FarmicleGrow Admin",
      passwordHash,
      isActive: true,
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "admin" } });

  // Admin User
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
}

async function main() {
  await seedRoles();
  await seedAdmin();
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
