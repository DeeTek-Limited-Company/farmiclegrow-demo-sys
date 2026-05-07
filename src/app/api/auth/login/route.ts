import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { APP_ROLES, type AppRole } from "@/lib/auth/constants";
import { AUTH_COOKIE_NAME, authCookieOptions, createSessionToken } from "@/lib/auth/session";
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
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
      return NextResponse.json({ message: "Your account does not exist or you are not onboarded yet." }, { status: 401 });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000 / 60);
      await logAudit({
        action: "USER_LOGIN_FAILED",
        userId: user.id,
        details: { email, reason: "Account locked" },
        ip,
        userAgent: request.headers.get("user-agent") || undefined,
        status: "FAILURE",
      });
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

    const roles = user.userRoles
      .map((item) => item.role.key)
      .filter((key): key is AppRole => APP_ROLES.includes(key as AppRole));

    if (roles.length === 0) {
      return NextResponse.json({ message: "No role assigned to this account." }, { status: 403 });
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
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
    });

    const response = NextResponse.json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        roles,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions);
    return response;
  } catch (error) {
    console.error("AUTH_LOGIN_ERROR", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    let code = "AUTH_LOGIN_FAILED";
    if (errorMessage.includes("AUTH_SECRET is not configured")) code = "AUTH_SECRET_MISSING";
    else if (errorMessage.includes("DATABASE_URL is not set")) code = "DATABASE_URL_MISSING";
    else if (errorMessage.includes("Can't reach database server")) code = "DB_UNREACHABLE";
    else if (errorMessage.toLowerCase().includes("tls")) code = "DB_TLS_ERROR";

    const message =
      process.env.NODE_ENV === "production" ? "Login failed. Please try again." : `Login failed: ${errorMessage}`;

    return NextResponse.json({ message, code }, { status: 500 });
  }
}
