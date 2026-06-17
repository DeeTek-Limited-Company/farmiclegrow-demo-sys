import { describe, expect, it } from "vitest";
import * as headerModule from "@/components/dashboard/header";

describe("dashboard header account routes", () => {
  it("uses org-scoped profile and settings routes for tenant users", () => {
    const getHeaderAccountLinks = (headerModule as any).getHeaderAccountLinks as
      | ((args: { userRole?: string; organizationSlug?: string | null }) => {
          profileHref: string;
          settingsHref: string;
        })
      | undefined;

    const links = getHeaderAccountLinks?.({
      userRole: "farmer",
      organizationSlug: "green-coop",
    });

    expect(links).toEqual({
      profileHref: "/org/green-coop/settings",
      settingsHref: "/org/green-coop/settings",
    });
  });

  it("falls back to role-safe account destinations for buyers and super admins", () => {
    const getHeaderAccountLinks = (headerModule as any).getHeaderAccountLinks as
      | ((args: { userRole?: string; organizationSlug?: string | null }) => {
          profileHref: string;
          settingsHref: string;
        })
      | undefined;

    expect(
      getHeaderAccountLinks?.({ userRole: "buyer", organizationSlug: null }),
    ).toEqual({
      profileHref: "/buyer/profile",
      settingsHref: "/buyer/profile",
    });

    expect(
      getHeaderAccountLinks?.({
        userRole: "super_admin",
        organizationSlug: null,
      }),
    ).toEqual({
      profileHref: "/super-admin/settings",
      settingsHref: "/super-admin/settings",
    });
  });
});
