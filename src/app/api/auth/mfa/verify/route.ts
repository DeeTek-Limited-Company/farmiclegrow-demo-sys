import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { verifyMfaToken } from "@/lib/auth/mfa";
import { z } from "zod";

const verifySchema = z.object({
  token: z.string().length(6),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid token format" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!dbUser || !dbUser.mfaSecret) {
    return NextResponse.json({ message: "MFA setup not initiated" }, { status: 400 });
  }

  const isValid = verifyMfaToken(parsed.data.token, dbUser.mfaSecret);

  if (!isValid) {
    return NextResponse.json({ message: "Invalid token" }, { status: 400 });
  }

  // Enable MFA
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });

  return NextResponse.json({ message: "MFA enabled successfully" });
}
