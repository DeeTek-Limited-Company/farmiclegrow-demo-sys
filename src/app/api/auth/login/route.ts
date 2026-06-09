import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { APP_ROLES, type AppRole } from "@/lib/auth/constants";
import { 
  AUTH_COOKIE_NAME, 
  authCookieOptions, 
  createSessionToken,
  createMfaChallengeToken 
} from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimiter } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import { logAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

/**
 * Calculates progressive delay in ms based on failed attempts.
 */
function getProgressiveDelay(attempts: number): number {
  if (attempts < 3) return 0;
  if (attempts < 5) return 1000; // 1s
  if (attempts < 10) return 3000; // 3s
  return 5000; // 5s
}

export async function POST(request: Request) {
  try {
    if (!process.env.AUTH_SECRET) {
      return NextResponse.json(
        { message: "Server misconfigured.", code: "AUTH_SECRET_MISSING" },
        { status: 500 },
      );
    }

    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_POOLER) {
      return NextResponse.json(
        { message: "Server misconfigured.", code: "DATABASE_URL_MISSING" },
        { status: 500 },
      );
    }

    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

    const limitCheck = rateLimiter.check(ip, 4);
    if (!limitCheck.success) {
      return NextResponse.json(
        {
          message: "Too many login attempts.",
          resetTime: limitCheck.resetTime,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid login payload." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const orgSlug = parsed.data.orgSlug?.toLowerCase().trim();

    // 1. Find the user first
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        organization: true,
      },
    });

    if (!user) {
      rateLimiter.fail(ip, 4, 10 * 60 * 1000);
      await logAudit({
        action: "USER_LOGIN_FAILED",
        details: { email, reason: "Account not found" },
        ip,
        userAgent: request.headers.get("user-agent") || undefined,
        status: "FAILURE",
      });
      return NextResponse.json({ 
        message: "Your account does not exist or you are not onboarded yet.",
      }, { status: 401 });
    }

    const roles = user.userRoles
      .map((item) => item.role.key)
      .filter((key): key is AppRole => APP_ROLES.includes(key as AppRole));

    const isSuperAdmin = roles.includes("super_admin");
    const isBuyer = roles.includes("buyer");

    // 2. Handle organization context
    let organization = user.organization;

    if (orgSlug) {
      // If a slug was provided, ensure it matches the user's org or they are super admin
      if (!isSuperAdmin && organization && organization.slug !== orgSlug) {
        return NextResponse.json({ 
          message: `Your account is not registered with this organization.`,
        }, { status: 401 });
      }
      
      // If user is a global buyer but trying to log in via an org slug
      if (isBuyer && !organization && orgSlug) {
         // This is fine, but we should find the org to check if it's active
         organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
      }
    }

    // If an organization is involved, ensure it's active
    if (organization && organization.status !== "ACTIVE" && organization.status !== "TRIAL") {
      return NextResponse.json({ message: "Organization is inactive." }, { status: 401 });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { message: `Your account is temporarily locked. Please try again in ${remainingTime} minutes.` },
        { status: 403 }
      );
    }

    const delay = getProgressiveDelay(user.failedLoginAttempts);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValidPassword) {
      rateLimiter.fail(ip, 4, 10 * 60 * 1000);

      const newAttempts = user.failedLoginAttempts + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockUntil,
        },
      });

      await logAudit({
        action: "USER_LOGIN_FAILED",
        userId: user.id,
        details: { email, reason: "Invalid password", attempt: newAttempts },
        ip,
        userAgent: request.headers.get("user-agent") || undefined,
        status: "FAILURE",
      });

      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Your account is still pending or deactivated. Please wait for approval." },
        { status: 403 }
      );
    }

    rateLimiter.reset(ip);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    await logAudit({
      action: "USER_LOGIN_SUCCESS",
      userId: user.id,
      ip,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    if (roles.length === 0) {
      return NextResponse.json({ message: "No role assigned to this account." }, { status: 403 });
    }

    if (user.mfaEnabled) {
      const mfaToken = await createMfaChallengeToken({
        userId: user.id,
        organizationId: organization?.id || null,
      });

      return NextResponse.json({
        message: "MFA required.",
        mfaRequired: true,
        mfaToken,
      });
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        expiresAt: new Date(Date.now() + authCookieOptions.maxAge * 1000),
        ip,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.fullName,
      roles,
      mustChangePassword: user.mustChangePassword,
      sessionId: session.id,
      organizationId: organization?.id || null,
      organizationSlug: organization?.slug || null,
      organizationStatus: (organization?.status as any) || "ACTIVE",
    });

    const response = NextResponse.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        roles,
        organizationId: organization?.id || null,
        organizationSlug: organization?.slug || null,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions);
    
    if (organization?.slug) {
      response.cookies.set("org_slug", organization.slug, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "An unexpected error occurred." }, { status: 500 });
  }
}
