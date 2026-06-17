import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("farmer onboarding UI safety", () => {
  it("does not persist sensitive onboarding drafts in localStorage", () => {
    const wizard = readFileSync(
      resolve(process.cwd(), "src/components/agronomist/farmer-onboarding-wizard.tsx"),
      "utf8",
    );

    expect(wizard).not.toContain("localStorage.");
    expect(wizard).not.toContain("STORAGE_KEY");
  });

  it("does not render credential-sharing UI in the onboarding wizard", () => {
    const wizard = readFileSync(
      resolve(process.cwd(), "src/components/agronomist/farmer-onboarding-wizard.tsx"),
      "utf8",
    );

    expect(wizard).not.toContain("Temporary Password");
    expect(wizard).not.toContain("Email / Login");
    expect(wizard).not.toContain("Share these login details");
  });

  it("does not show initial farmer access details on the agronomist farmer profile", () => {
    const farmerProfile = readFileSync(
      resolve(process.cwd(), "src/app/org/[orgSlug]/(dashboard)/agronomist/farmers/[farmerId]/page.tsx"),
      "utf8",
    );

    expect(farmerProfile).not.toContain("Initial Access Details");
    expect(farmerProfile).not.toContain("temporaryPassword");
    expect(farmerProfile).not.toContain("prisma.user.findUnique");
  });
});
