import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isValidPostgresUrl(value: string | undefined): value is string {
  if (!value) return false;
  if (!(value.startsWith("postgresql://") || value.startsWith("postgres://"))) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function removeQueryParam(url: string, param: string): string {
  const u = new URL(url);
  u.searchParams.delete(param);
  return u.toString();
}

const poolerUrl = process.env.DATABASE_URL_POOLER;
const directUrl = process.env.DATABASE_URL;
const connectionString = isValidPostgresUrl(poolerUrl) ? poolerUrl : directUrl;
const isSupabaseUrl = Boolean(
  connectionString && (connectionString.includes("supabase.co") || connectionString.includes("supabase.com")),
);
const shouldUseSsl = Boolean(
  connectionString &&
    (isSupabaseUrl ||
      connectionString.includes("sslmode=require") ||
      connectionString.includes("sslmode=verify-ca") ||
      connectionString.includes("sslmode=verify-full")),
);
const rejectUnauthorized =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false" ? false : process.env.NODE_ENV === "production";

export const prisma: PrismaClient =
  !connectionString
    ? (new Proxy({} as PrismaClient, {
        get() {
          throw new Error("DATABASE_URL is not set.");
        },
      }) as PrismaClient)
    : (globalForPrisma.prisma &&
        "auditLog" in globalForPrisma.prisma &&
        "batch" in globalForPrisma.prisma &&
        "productionRecord" in globalForPrisma.prisma &&
        "region" in globalForPrisma.prisma &&
        "district" in globalForPrisma.prisma &&
        "community" in globalForPrisma.prisma &&
        "agronomistDistrict" in globalForPrisma.prisma &&
        "farmPlot" in globalForPrisma.prisma &&
        "plantingActivity" in globalForPrisma.prisma &&
        "fieldActivity" in globalForPrisma.prisma &&
        "inputTraceability" in globalForPrisma.prisma &&
        "harvestRecord" in globalForPrisma.prisma &&
        "qualityTest" in globalForPrisma.prisma &&
        "movementLog" in globalForPrisma.prisma &&
        "warehouseEntry" in globalForPrisma.prisma &&
        "salesRecord" in globalForPrisma.prisma
      ? globalForPrisma.prisma
      : new PrismaClient({
          adapter: new PrismaPg(
            shouldUseSsl
              ? {
                  connectionString: removeQueryParam(connectionString, "sslmode"),
                  ssl: { rejectUnauthorized },
                  connectionTimeoutMillis: 8000,
                  idleTimeoutMillis: 15000,
                  max: 10,
                }
              : {
                  connectionString,
                  connectionTimeoutMillis: 8000,
                  idleTimeoutMillis: 15000,
                  max: 10,
                },
          ),
        }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
