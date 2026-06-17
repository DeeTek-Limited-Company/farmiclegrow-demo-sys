import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("farmer dashboard layout", () => {
  it("uses the shared premium dashboard primitives", () => {
    const file = readFileSync(
      resolve(process.cwd(), "src/app/org/[orgSlug]/(dashboard)/farmer/page.tsx"),
      "utf8",
    );

    expect(file).toContain("MetricCard");
    expect(file).toContain("text-[10px] font-black uppercase tracking-[0.22em] text-primary");
  });
});
