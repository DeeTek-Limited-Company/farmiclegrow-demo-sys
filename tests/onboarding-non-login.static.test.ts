import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDashboardNavGroups, getPrimaryNavItems } from "@/components/dashboard/nav-config";
import { getHeaderAccountLinks } from "@/components/dashboard/header";

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("onboarding non-login navigation contract", () => {
  it("does not emit farmer self-service navigation in the shared dashboard path", () => {
    expect(getDashboardNavGroups("farmer")).toEqual([]);
    expect(getPrimaryNavItems("farmer")).toEqual([]);
  });

  it("does not direct farmer role account links to /farmer/profile", () => {
    const links = getHeaderAccountLinks({
      userRole: "farmer",
      organizationSlug: "green-coop",
    });

    expect(links.profileHref).toBe("/org/green-coop/settings");
    expect(links.settingsHref).toBe("/org/green-coop/settings");
    expect(links.profileHref).not.toContain("/farmer/profile");
  });

  it("does not redirect bare /farmer routes into org-scoped paths", () => {
    const middleware = read("middleware.ts");

    expect(middleware).not.toContain('pathname.startsWith("/farmer")');
  });
});

