import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("buyer dashboard layout", () => {
  it("uses premium metric cards and action tiles for buyer overview pages", () => {
    const orgBuyer = readFileSync(
      resolve(process.cwd(), "src/app/org/[orgSlug]/(dashboard)/buyer/page.tsx"),
      "utf8",
    );
    const globalBuyer = readFileSync(
      resolve(process.cwd(), "src/app/buyer/(dashboard)/page.tsx"),
      "utf8",
    );

    expect(orgBuyer).toContain("MetricCard");
    expect(orgBuyer).toContain("ActionTile");
    expect(globalBuyer).toContain("MetricCard");
    expect(globalBuyer).toContain("ActionTile");
  });
});
