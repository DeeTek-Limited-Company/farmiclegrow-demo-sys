import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (existsSync(".env.local")) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
}

const args = new Set(process.argv.slice(2));
const shouldGeneratePassword = args.has("--generate");
const allowProduction = args.has("--allow-production");
const resetExisting = args.has("--reset");

function getDatabaseTarget(): string {
  const url =
    process.env.DATABASE_URL_MIGRATE ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_POOLER ||
    process.env.DATABASE_URL_DIRECT;

  if (!url) {
    throw new Error("No database URL configured. Set DATABASE_URL or DATABASE_URL_MIGRATE.");
  }

  try {
    return new URL(url).host;
  } catch {
    return "unknown host";
  }
}

function assertSafeTarget() {
  const url =
    process.env.DATABASE_URL_MIGRATE ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_POOLER ||
    process.env.DATABASE_URL_DIRECT ||
    "";

  const isRemote =
    url.includes("supabase.co") ||
    url.includes("supabase.com") ||
    process.env.NODE_ENV === "production";

  if (isRemote && !allowProduction) {
    throw new Error(
      "Refusing to modify a remote/production database without --allow-production.",
    );
  }
}

function generatePassword(length = 24): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_+=";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join("");
}

async function promptHidden(question: string): Promise<string> {
  output.write(question);

  if (!input.isTTY) {
    throw new Error("Interactive password entry requires a TTY. Use --generate instead.");
  }

  input.setEncoding("utf8");
  input.resume();

  const wasRaw = input.isRaw;
  input.setRawMode(true);

  let value = "";

  return new Promise((resolve, reject) => {
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          input.setRawMode(wasRaw ?? false);
          input.removeListener("data", onData);
          output.write("\n");
          resolve(value);
          return;
        }

        if (char === "\u0003") {
          input.setRawMode(wasRaw ?? false);
          input.removeListener("data", onData);
          reject(new Error("Cancelled."));
          return;
        }

        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        value += char;
      }
    };

    input.on("data", onData);
  });
}

async function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function ensureSuperAdminRole() {
  return prisma.role.upsert({
    where: { key: "super_admin" },
    update: { name: "Super Administrator" },
    create: { key: "super_admin", name: "Super Administrator" },
  });
}

async function ensureDefaultOrganization() {
  return prisma.organization.upsert({
    where: { slug: "farmiclegrow" },
    update: {
      name: "FarmicleGrow Exporters",
      status: "ACTIVE",
    },
    create: {
      id: "org_default",
      name: "FarmicleGrow Exporters",
      slug: "farmiclegrow",
      status: "ACTIVE",
    },
  });
}

async function findExistingSuperAdmin() {
  return prisma.user.findFirst({
    where: {
      userRoles: {
        some: {
          role: { key: "super_admin" },
        },
      },
    },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });
}

async function createSuperAdmin() {
  assertSafeTarget();

  const target = getDatabaseTarget();
  console.log(`Target database: ${target}`);

  const existing = await findExistingSuperAdmin();
  if (existing && !resetExisting) {
    throw new Error(
      `A super admin already exists (${existing.email}). Use --reset to rotate that account's password.`,
    );
  }

  // Parse command-line arguments for email and password (for automation)
  // Format: npm run create-super-admin -- email password [fullName]
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  let email, fullName, password;

  if (args.length >= 2) {
    email = args[0].toLowerCase();
    password = args[1];
    fullName = args[2] || "FarmicleGrow Platform Admin";
  } else {
    // Interactive mode
    const emailInput = await promptLine("Super admin email: ");
    email = emailInput.toLowerCase();
    const fullNameInput = await promptLine("Full name [FarmicleGrow Platform Admin]: ");
    fullName = fullNameInput || "FarmicleGrow Platform Admin";

    if (shouldGeneratePassword) {
      password = generatePassword();
      console.log("\nGenerated one-time password (copy it now, it will not be shown again):");
      console.log(password);
      console.log("");
    } else {
      password = await promptHidden("Password (hidden): ");
      const confirm = await promptHidden("Confirm password (hidden): ");
      if (!password || password.length < 12) {
        throw new Error("Password must be at least 12 characters.");
      }
      if (password !== confirm) {
        throw new Error("Passwords do not match.");
      }
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (!password || password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  const [role, organization] = await Promise.all([ensureSuperAdminRole(), ensureDefaultOrganization()]);
  const passwordHash = await hashPassword(password);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          fullName,
          passwordHash,
          isActive: true,
          organizationId: organization.id,
          failedLoginAttempts: 0,
          lockUntil: null,
          mustChangePassword: false,
        },
      })
    : await prisma.user.upsert({
        where: { email },
        update: {
          fullName,
          passwordHash,
          isActive: true,
          organizationId: organization.id,
          failedLoginAttempts: 0,
          lockUntil: null,
          mustChangePassword: false,
        },
        create: {
          email,
          fullName,
          passwordHash,
          isActive: true,
          organizationId: organization.id,
        },
      });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  console.log(`Super admin ready: ${user.email}`);
  console.log("Credentials are stored as a password hash in the database only.");
}

createSuperAdmin()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
