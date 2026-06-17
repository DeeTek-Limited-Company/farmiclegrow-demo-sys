import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("internal trace mobile layout", () => {
  it("uses stacked mobile-first grids and sidebar fallbacks", () => {
    const file = readFileSync(
      resolve(
        process.cwd(),
        "src/app/org/[orgSlug]/(dashboard)/trace/[code]/page.tsx",
      ),
      "utf8",
    );

    expect(file).toContain("grid-cols-1 2xl:grid-cols-3");
    expect(file).toContain("order-2 2xl:order-none");
    expect(file).toContain("flex-col sm:flex-row");
  });
});
