import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function isSkipped(relPath: string) {
  const normalized = relPath.replace(/\\/g, "/");
  return (
    normalized.startsWith("public/") ||
    normalized.startsWith("auth/") ||
    normalized.startsWith("health/") ||
    normalized.startsWith("regions/") ||
    normalized.startsWith("super-admin/") ||
    normalized.startsWith("uploads/") ||
    normalized.startsWith("webhooks/")
  );
}

describe("Tenant isolation coverage (static)", () => {
  it("all non-public API route handlers enforce org scope", () => {
    const apiRoot = path.resolve(__dirname, "../src/app/api");
    const all = walk(apiRoot)
      .filter((p) => p.endsWith("route.ts"))
      .map((p) => ({ abs: p, rel: path.relative(apiRoot, p) }))
      .filter((p) => !isSkipped(p.rel));

    const offenders: Array<{ rel: string; reason: string }> = [];

    for (const f of all) {
      const text = fs.readFileSync(f.abs, "utf8");
      const usesGuard = text.includes("requireApiRole(");
      if (!usesGuard) continue;

      const hasOrgScope =
        text.includes("requireOrgScope(") ||
        text.includes("tenantWhere(") ||
        text.includes("withTenantAndDistrictFilter(");

      if (!hasOrgScope) {
        offenders.push({ rel: f.rel.replace(/\\/g, "/"), reason: "missing org-scope helper usage" });
      }
    }

    expect(offenders).toEqual([]);
  });
});
