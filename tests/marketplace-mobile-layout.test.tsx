import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MarketplaceClient } from "@/components/buyer/marketplace-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} />,
}));

describe("buyer marketplace mobile layout", () => {
  it("renders stacked mobile actions and tighter single-column cards", () => {
    const markup = renderToStaticMarkup(
      <MarketplaceClient
        initialListings={[
          {
            id: "listing-1",
            batchId: "FG-001",
            title: "Premium Maize",
            description: "Verified maize batch",
            price: 350,
            currency: "USD",
            status: "ACTIVE",
            images: [],
            category: "grain",
            tags: ["export", "grade-a", "verified"],
            isFeatured: true,
            minOrderQuantity: 1,
            unit: "ton",
            organizationId: "org-1",
            organization: { id: "org-1", name: "Afro Pulse", slug: "afro-pulse" },
            batch: {
              id: "batch-1",
              batchId: "FG-001",
              crop: "Maize",
              quantity: 20,
              farmer: {
                fullName: "Kofi Mensah",
                community: {
                  name: "Nsawam",
                  district: { name: "Eastern" },
                },
              },
            },
          },
        ]}
      />,
    );

    expect(markup).toContain("grid-cols-1 md:grid-cols-2 xl:grid-cols-3");
    expect(markup).toContain("flex-col sm:flex-row");
    expect(markup).toContain("w-full sm:w-12");
    expect(markup).toContain("rounded-[2rem]");
  });
});
