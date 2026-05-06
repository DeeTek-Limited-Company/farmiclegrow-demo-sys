import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    try {
      const payload = await verifySessionToken(token);
      if (payload.sessionId) {
        // Revoke the session in the database
        await prisma.session.update({
          where: { id: payload.sessionId },
          data: { revoked: true },
        });
      }
    } catch {
      // Ignore errors if token is already invalid
    }
  }

  const response = NextResponse.json({ message: "Logout successful." });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    maxAge: 0,
    expires: new Date(0),
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}
