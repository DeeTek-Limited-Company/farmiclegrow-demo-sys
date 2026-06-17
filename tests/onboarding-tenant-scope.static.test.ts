import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readAppFile(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("onboarding tenant scoping", () => {
  it("scopes the agronomist onboarding list to the active organization", () => {
    const file = readAppFile("src/app/org/[orgSlug]/(dashboard)/agronomist/onboarding/page.tsx");

    expect(file).toContain("requireOrgScope");
    expect(file).toContain("organizationId");
  });

  it("scopes the onboarding queue to the active organization", () => {
    const file = readAppFile("src/app/org/[orgSlug]/(dashboard)/agronomist/onboarding-queue/page.tsx");

    expect(file).toContain("requireOrgScope");
    expect(file).toContain("organizationId");
  });

  it("scopes agronomist farmer detail queries to the active organization", () => {
    const file = readAppFile("src/app/org/[orgSlug]/(dashboard)/agronomist/farmers/[farmerId]/page.tsx");

    expect(file).toContain("organizationId");
    expect(file).toMatch(/agronomistDistrict\.findMany\(\{[\s\S]*organizationId/);
    expect(file).toMatch(/farmer\.findFirst\(\{[\s\S]*organizationId/);
    expect(file).toMatch(/auditLog\.findMany\(\{[\s\S]*organizationId/);
  });

  it("scopes farmer resolution to the active organization", () => {
    const file = readAppFile("src/app/org/[orgSlug]/(dashboard)/farmer/page.tsx");

    expect(file).toContain("organizationId");
    expect(file).toMatch(/farmer\.findFirst\(\{[\s\S]*organizationId/);
  });
});
