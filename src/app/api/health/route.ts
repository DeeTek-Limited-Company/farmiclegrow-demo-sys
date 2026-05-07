import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET);
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_POOLER);

  let databaseReachable: boolean | null = null;
  let databaseErrorCode: string | null = null;

  if (databaseUrlConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      databaseReachable = false;
      if (message.includes("Can't reach database server")) databaseErrorCode = "DB_UNREACHABLE";
      else if (message.toLowerCase().includes("tls")) databaseErrorCode = "DB_TLS_ERROR";
      else databaseErrorCode = "DB_ERROR";
    }
  }

  const ok = authSecretConfigured && databaseUrlConfigured && databaseReachable !== false;

  return NextResponse.json(
    {
      ok,
      checks: {
        authSecretConfigured,
        databaseUrlConfigured,
        databaseReachable,
        databaseErrorCode,
      },
    },
    { status: ok ? 200 : 500 },
  );
}

