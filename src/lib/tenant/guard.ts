import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { requireOrgScope } from "./scope";
import { NextResponse } from "next/server";

export type TenantGuardResult =
  | {
      ok: true;
      user: CurrentUser;
      organizationId: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
      response: NextResponse;
    };

/**
 * A guard for API routes that ensures the user is authenticated 
 * and belongs to an organization.
 */
export async function requireTenantAccess(): Promise<TenantGuardResult> {
  const user = await getCurrentUser();
  
  if (!user) {
    return {
      ok: false,
      status: 401,
      message: "Authentication is required.",
      response: NextResponse.json({ message: "Authentication is required." }, { status: 401 }),
    };
  }

  try {
    const organizationId = requireOrgScope(user);
    return {
      ok: true,
      user,
      organizationId,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 403,
      message: error.message || "Organization context is missing.",
      response: NextResponse.json(
        { message: error.message || "Organization context is missing." }, 
        { status: 403 }
      ),
    };
  }
}
