import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/session";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ 
      message: "Invalid password.",
      errors: parsed.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        temporaryPassword: null, // Clear the temporary password once changed
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    // Create a new session token with the updated mustChangePassword flag
    const roles = updatedUser.userRoles.map(ur => ur.role.key as any);
    const token = await createSessionToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.fullName,
      roles,
      mustChangePassword: false,
      sessionId: user.sessionId, // Keep the same session
    });

    const response = NextResponse.json({ message: "Password updated." });
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions);
    
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to update password." }, { status: 500 });
  }
}
