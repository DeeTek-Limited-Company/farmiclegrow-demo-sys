import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyMfaToken } from "@/lib/auth/mfa";
import { verifySessionToken, createSessionToken, AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/session";
import { APP_ROLES, type AppRole } from "@/lib/auth/constants";
import { logAudit } from "@/lib/security/audit";

const verifySchema = z.object({
  token: z.string().length(6),
  mfaToken: z.string(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    const { token, mfaToken } = parsed.data;

    // Verify the challenge token
    const challenge = await verifySessionToken(mfaToken);
    if (!challenge || challenge.type !== "mfa_challenge") {
      return NextResponse.json({ message: "Invalid or expired MFA session" }, { status: 401 });
    }

    const userId = challenge.sub as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        organization: true,
      },
    });

    if (!user || !user.mfaSecret || !user.organization) {
      return NextResponse.json({ message: "MFA not configured" }, { status: 400 });
    }

    // Verify TOTP token
    const isValid = verifyMfaToken(token, user.mfaSecret);
    if (!isValid) {
      await logAudit({
        action: "USER_LOGIN_FAILED",
        userId: user.id,
        organizationId: user.organizationId || undefined,
        details: { reason: "Invalid MFA token" },
        ip,
        userAgent,
        status: "FAILURE",
      });
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Success! Create full session
    const roles = user.userRoles
      .map((item) => item.role.key)
      .filter((key): key is AppRole => APP_ROLES.includes(key as AppRole));

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        expiresAt: new Date(Date.now() + authCookieOptions.maxAge * 1000),
        ip,
        userAgent: userAgent || null,
      },
    });

    const fullToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.fullName,
      roles,
      mustChangePassword: user.mustChangePassword,
      sessionId: session.id,
      organizationId: user.organization.id,
      organizationSlug: user.organization.slug,
      organizationStatus: user.organization.status,
    });

    await logAudit({
      action: "USER_LOGIN_SUCCESS",
      userId: user.id,
      organizationId: user.organizationId || undefined,
      details: { mfaUsed: true },
      ip,
      userAgent,
    });

    const response = NextResponse.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        roles,
        organizationId: user.organization.id,
        organizationSlug: user.organization.slug,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, fullToken, authCookieOptions);
    return response;
  } catch (error) {
    console.error("MFA_VERIFY_ERROR", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
