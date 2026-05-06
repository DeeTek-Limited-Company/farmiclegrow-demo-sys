import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, authCookieOptions, createSessionToken } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/validations/auth";
import { rateLimiter } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const limitCheck = rateLimiter.check(ip, 6);
  if (!limitCheck.success) {
    return NextResponse.json(
      {
        message: "Too many signup attempts.",
        resetTime: limitCheck.resetTime,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const fullName = parsed.data.fullName.trim();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ message: "User with this email already exists" }, { status: 409 });
  }

  const buyerRole = await prisma.role.findUnique({ where: { key: "buyer" } });
  if (!buyerRole) {
    return NextResponse.json({ message: "Buyer role is not configured." }, { status: 500 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const { user, sessionId } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    await tx.userRole.create({
      data: {
        userId: createdUser.id,
        roleId: buyerRole.id,
      },
    });

    const session = await tx.session.create({
      data: {
        userId: createdUser.id,
        expiresAt: new Date(Date.now() + authCookieOptions.maxAge * 1000),
        ip,
        userAgent: userAgent || null,
      },
    });

    return { user: createdUser, sessionId: session.id };
  });

  await logAudit({
    action: "BUYER_SIGNUP",
    userId: user.id,
    details: { email: user.email },
    ip,
    userAgent,
  });

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.fullName,
    roles: ["buyer"],
    mustChangePassword: user.mustChangePassword,
    sessionId,
  });

  const response = NextResponse.json(
    {
      message: "Signup successful.",
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        roles: ["buyer"],
      },
    },
    { status: 201 },
  );

  response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions);
  return response;
}

