import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("agronomist dashboard alignment", () => {
  it("keeps the field overview structure while adopting the shared premium eyebrow", () => {
    const file = readFileSync(
      resolve(process.cwd(), "src/app/org/[orgSlug]/(dashboard)/agronomist/page.tsx"),
      "utf8",
    );

    expect(file).toContain("Field workspace");
    expect(file).toContain("text-[10px] font-black uppercase tracking-[0.22em] text-primary");
  });

  it("uses a stacked welcome block instead of one compact inline sentence", () => {
    const file = readFileSync(
      resolve(process.cwd(), "src/app/org/[orgSlug]/(dashboard)/agronomist/page.tsx"),
      "utf8",
    );

    expect(file).toContain("space-y-3");
    expect(file).toContain("Welcome back");
    expect(file).toContain("Here&apos;s a quick view of what needs attention across your territory today.");
  });
});
