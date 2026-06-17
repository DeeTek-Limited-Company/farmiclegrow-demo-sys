import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("farmer non-login UI contract", () => {
  it("does not frame agronomist farmer management as account access management", () => {
    const manager = readFileSync(resolve(process.cwd(), "src/components/agronomist/onboarding-manager.tsx"), "utf8");
    const detail = readFileSync(
      resolve(process.cwd(), "src/app/org/[orgSlug]/(dashboard)/agronomist/farmers/[farmerId]/page.tsx"),
      "utf8",
    );

    expect(manager).not.toContain("login credentials");
    expect(manager).not.toContain("login access");
    expect(detail).not.toContain("Initial Access Details");
  });
});

