import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

describe("dashboard shell mobile nav anchoring", () => {
  it("renders the mobile nav outside the clipped shell container", () => {
    const markup = renderToStaticMarkup(
      <DashboardShell
        tabletSidebar={<div data-testid="tablet-sidebar">Tablet Sidebar</div>}
        desktopSidebar={<div data-testid="desktop-sidebar">Desktop Sidebar</div>}
        mobileSidebar={<div data-testid="mobile-sidebar">Mobile Sidebar</div>}
        header={<div data-testid="header">Header</div>}
        mobileNav={<div data-testid="mobile-nav">Mobile Nav</div>}
      >
        <div data-testid="content">Content</div>
      </DashboardShell>,
    );

    const mobileNavIndex = markup.indexOf("data-testid=\"mobile-nav\"");
    const contentIndex = markup.indexOf("data-testid=\"content\"");
    const clippedContainerIndex = markup.indexOf("overflow-hidden border border-primary/10 bg-card/75");

    expect(clippedContainerIndex).toBeGreaterThan(-1);
    expect(contentIndex).toBeGreaterThan(clippedContainerIndex);
    expect(mobileNavIndex).toBeGreaterThan(contentIndex);
  });
});
