import { CurrentUser } from "@/lib/auth/server";

/**
 * Ensures the user has an organization scope.
 * Throws an error if the user is not bound to an organization.
 * For platform-wide super_admin actions, this might be bypassed, 
 * but for tenant-scoped operations, this is mandatory.
 */
export function requireOrgScope(user: CurrentUser): string {
  if (!user.organizationId) {
    throw new Error("User is not bound to an organization.");
  }
  return user.organizationId;
}

/**
 * Asserts that a resource belongs to the user's organization.
 * @param resource - Any object with an organizationId property
 * @param user - The current user session
 * @throws Error if the organizationId does not match
 */
export function assertResourceBelongsToOrg(
  resource: { organizationId: string | null },
  user: CurrentUser
): void {
  const orgId = requireOrgScope(user);
  if (resource.organizationId !== orgId) {
    // We throw a generic error that can be caught and turned into a 404 or 403
    throw new Error("Access denied: Resource belongs to another organization.");
  }
}

/**
 * Returns a standard Prisma filter for organizationId.
 */
export function tenantWhere(user: CurrentUser) {
  return {
    organizationId: requireOrgScope(user),
  };
}
