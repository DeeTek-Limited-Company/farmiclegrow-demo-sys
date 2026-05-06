import { prisma } from "@/lib/prisma";

/**
 * Checks if the session is valid in the database.
 * Part of the hybrid session model to allow revocation.
 * This function must ONLY be called from Node.js runtime (API routes, Server Components).
 */
export async function isSessionValid(sessionId: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
}
