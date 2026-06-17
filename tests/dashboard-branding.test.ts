import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("dashboard branding", () => {
  it("uses warm brand-led surfaces across the shared dashboard primitives", () => {
    const metricCard = readFileSync(resolve(process.cwd(), "src/components/dashboard/metric-card.tsx"), "utf8");
    const actionTile = readFileSync(resolve(process.cwd(), "src/components/dashboard/action-tile.tsx"), "utf8");
    const shell = readFileSync(resolve(process.cwd(), "src/components/dashboard/dashboard-shell.tsx"), "utf8");
    const header = readFileSync(resolve(process.cwd(), "src/components/dashboard/header.tsx"), "utf8");

    expect(metricCard).toContain("bg-[#FFF9EF]");
    expect(metricCard).toContain("emerald: \"bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-100\"");
    expect(actionTile).toContain("bg-[#FFFDF6]");
    expect(actionTile).toContain("text-primary/80");
    expect(shell).toContain("bg-card/75");
    expect(shell).toContain("bg-accent/10");
    expect(header).toContain("bg-card/70");
    expect(header).toContain("border-primary/10");
  });
});
