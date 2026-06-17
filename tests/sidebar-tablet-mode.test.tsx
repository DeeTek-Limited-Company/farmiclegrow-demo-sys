import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/dashboard/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/org/green-coop/buyer/marketplace",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} />
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: {
      organizationSlug: "green-coop",
    },
  }),
}));

describe("sidebar tablet mode", () => {
  it("renders a slim tablet rail instead of the full desktop navigation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Sidebar as never, {
        userRole: "buyer",
        mode: "tablet",
      }),
    );

    expect(markup).toContain("hidden");
    expect(markup).toContain("md:flex");
    expect(markup).toContain("lg:hidden");
    expect(markup).toContain("w-20");
    expect(markup).not.toContain("Sign Out");
    expect(markup).not.toContain("Buyer Hub");
  });
});
