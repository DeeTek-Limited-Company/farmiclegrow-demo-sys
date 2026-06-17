import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("onboarding write rate limiting", () => {
  it("exposes a dedicated write policy helper for onboarding-sensitive routes", async () => {
    const rateLimitModule = (await import("@/lib/security/rate-limit")) as Record<string, unknown>;

    expect(rateLimitModule).toHaveProperty("getWriteRateLimitPolicy");
  });

  it("wires middleware through the write policy helper instead of a single raw IP bucket", () => {
    const middlewareFile = readFileSync(resolve(process.cwd(), "middleware.ts"), "utf8");

    expect(middlewareFile).toContain("getWriteRateLimitPolicy");
    expect(middlewareFile).not.toContain("rateLimiter.check(ip, 50)");
    expect(middlewareFile).not.toContain("rateLimiter.fail(ip, 50, 60000)");
  });
});
