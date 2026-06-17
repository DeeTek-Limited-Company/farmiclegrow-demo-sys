import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("agronomist batches mobile layout", () => {
  it("uses stacked action groups for phone layouts", () => {
    const file = readFileSync(
      resolve(
        process.cwd(),
        "src/app/org/[orgSlug]/(dashboard)/agronomist/batches/page.tsx",
      ),
      "utf8",
    );

    expect(file).toContain("flex-col xl:flex-row");
    expect(file).toContain("w-full sm:w-auto");
    expect(file).toContain("flex-col sm:flex-row");
  });
});
