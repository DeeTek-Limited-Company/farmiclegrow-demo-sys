import { describe, expect, it } from "vitest";

import {
  buildInternalOrgTracePath,
  buildInternalOrgTraceUrl,
  buildOrgTracePath,
  buildOrgTraceUrl,
  resolveInternalAppBaseUrl,
  resolvePublicSiteBaseUrl,
} from "@/lib/trace/urls";

describe("trace url helpers", () => {
  it("builds an organization-scoped trace path", () => {
    expect(buildOrgTracePath("afro-pulse", "FG-2026-COWP-0002")).toBe(
      "/org/afro-pulse/trace/FG-2026-COWP-0002",
    );
  });

  it("uses configured public site url when provided", () => {
    expect(
      resolvePublicSiteBaseUrl({
        configuredUrl: "https://trace.farmiclegrow.com/",
        nodeEnv: "production",
      }),
    ).toBe("https://trace.farmiclegrow.com");
  });

  it("falls back to the website dev server in development", () => {
    expect(resolvePublicSiteBaseUrl({ configuredUrl: "", nodeEnv: "development" })).toBe(
      "http://localhost:3000",
    );
  });

  it("builds a full organization trace url", () => {
    expect(
      buildOrgTraceUrl({
        orgSlug: "afro-pulse",
        batchId: "FG-2026-COWP-0002",
        configuredUrl: "https://farmiclegrow.com/",
        nodeEnv: "production",
      }),
    ).toBe("https://farmiclegrow.com/org/afro-pulse/trace/FG-2026-COWP-0002");
  });

  it("builds an internal organization trace path", () => {
    expect(buildInternalOrgTracePath("afro-pulse", "FG-2026-COWP-0002")).toBe(
      "/org/afro-pulse/trace/FG-2026-COWP-0002",
    );
  });

  it("falls back to the app dev server for internal trace urls", () => {
    expect(resolveInternalAppBaseUrl({ configuredUrl: "", nodeEnv: "development" })).toBe(
      "http://localhost:3001",
    );
  });

  it("builds a full internal organization trace url", () => {
    expect(
      buildInternalOrgTraceUrl({
        orgSlug: "afro-pulse",
        batchId: "FG-2026-COWP-0002",
        configuredUrl: "https://app.farmiclegrow.com/",
        nodeEnv: "production",
      }),
    ).toBe("https://app.farmiclegrow.com/org/afro-pulse/trace/FG-2026-COWP-0002");
  });
});
