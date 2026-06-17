import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { generateMfaSecret, generateOtpAuthUri, generateQrCode } from "@/lib/auth/mfa";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if MFA is already enabled
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true, mfaSecret: true, email: true },
  });

  if (!dbUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (dbUser.mfaEnabled) {
    return NextResponse.json({ message: "MFA is already enabled" }, { status: 400 });
  }

  // Generate secret and QR code
  const secret = generateMfaSecret();
  const uri = generateOtpAuthUri(dbUser.email, "FarmicleGrow", secret);
  const qrCode = await generateQrCode(uri);

  // Store secret temporarily (or permanently but not enabled yet)
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret },
  });

  return NextResponse.json({
    secret,
    qrCode,
  });
}
