import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, type AppRole } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { isSessionValid } from "@/lib/auth/session-db";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
  mustChangePassword: boolean;
  sessionId: string;
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

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles,
      mustChangePassword: payload.mustChangePassword,
      sessionId: payload.sessionId,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
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
