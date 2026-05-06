import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import type { AppRole } from "@/lib/auth/constants";

export type GuardResult =
  | {
      ok: true;
      user: CurrentUser;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
    };

export async function requireApiRole(roles: AppRole[]): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      message: "Authentication is required.",
    };
  }

  const hasRole = user.roles.some((role) => roles.includes(role));
  if (!hasRole) {
    return {
      ok: false,
      status: 403,
      message: "You do not have permission to perform this action.",
    };
  }

  return {
    ok: true,
    user,
  };
}
