import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, type AppRole } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { isSessionValid, revokeSession, revokeSessionsForOrg } from "@/lib/auth/session-db";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
  mustChangePassword: boolean;
  sessionId: string;
  organizationId: string | null;
  organizationSlug: string | null;
  organizationStatus: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);

    // Hybrid session model: check DB
    const isValid = await isSessionValid(payload.sessionId);
    if (!isValid) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        isActive: true,
        organizationId: true,
        organization: { select: { slug: true, status: true } },
      },
    });

    if (!dbUser || !dbUser.isActive) {
      await revokeSession(payload.sessionId).catch(() => {});
      return null;
    }

    const orgStatus = dbUser.organization?.status ?? null;
    if (dbUser.organizationId && orgStatus && orgStatus !== "ACTIVE" && orgStatus !== "TRIAL") {
      await revokeSessionsForOrg(dbUser.organizationId).catch(() => {});
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles,
      mustChangePassword: payload.mustChangePassword,
      sessionId: payload.sessionId,
      organizationId: dbUser.organizationId,
      organizationSlug: dbUser.organization?.slug ?? payload.organizationSlug,
      organizationStatus: orgStatus ?? payload.organizationStatus,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const cookieStore = await cookies();
    const orgSlug = cookieStore.get("org_slug")?.value;
    redirect(orgSlug ? `/org/${orgSlug}` : "/");
  }

  return user;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await requireUser();
  const hasRole = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    redirect("/forbidden");
  }

  return user;
}
