import { describe, it, expect } from "vitest";
import { requireOrgScope, assertResourceBelongsToOrg, tenantWhere } from "@/lib/tenant/scope";
import { CurrentUser } from "@/lib/auth/server";

describe("Tenant Isolation Helpers", () => {
  const mockUserOrgA: CurrentUser = {
    id: "user-1",
    email: "user1@orga.com",
    name: "User A",
    roles: ["admin"],
    mustChangePassword: false,
    sessionId: "sess-1",
    organizationId: "org-a",
    organizationSlug: "org-a",
    organizationStatus: "ACTIVE",
  };

  const mockUserNoOrg: CurrentUser = {
    id: "user-2",
    email: "user2@none.com",
    name: "User No Org",
    roles: ["super_admin"],
    mustChangePassword: false,
    sessionId: "sess-2",
    organizationId: "",
    organizationSlug: "",
    organizationStatus: "",
  };

  describe("requireOrgScope", () => {
    it("should return organizationId for a scoped user", () => {
      expect(requireOrgScope(mockUserOrgA)).toBe("org-a");
    });

    it("should throw an error for an unscoped user", () => {
      expect(() => requireOrgScope(mockUserNoOrg)).toThrow("User is not bound to an organization.");
    });
  });

  describe("assertResourceBelongsToOrg", () => {
    it("should pass if resource belongs to user's org", () => {
      const resource = { id: "res-1", organizationId: "org-a" };
      expect(() => assertResourceBelongsToOrg(resource, mockUserOrgA)).not.toThrow();
    });

    it("should throw if resource belongs to another org", () => {
      const resource = { id: "res-2", organizationId: "org-b" };
      expect(() => assertResourceBelongsToOrg(resource, mockUserOrgA)).toThrow("Access denied: Resource belongs to another organization.");
    });

    it("should throw if resource organizationId is null", () => {
      const resource = { id: "res-3", organizationId: null };
      expect(() => assertResourceBelongsToOrg(resource, mockUserOrgA)).toThrow("Access denied: Resource belongs to another organization.");
    });
  });

  describe("tenantWhere", () => {
    it("should return a correctly formatted prisma filter", () => {
      expect(tenantWhere(mockUserOrgA)).toEqual({ organizationId: "org-a" });
    });
  });
});
