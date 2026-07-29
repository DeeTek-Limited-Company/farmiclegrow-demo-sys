import { beforeEach, describe, expect, it, vi } from "vitest";

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
);

const prismaMock = vi.hoisted(() => ({
  organization: {
    findUnique: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("OrgLayout - Organization Slug Validation", () => {
  beforeEach(() => {
    vi.resetModules();
    notFoundMock.mockClear();
    prismaMock.organization.findUnique.mockReset();
  });

  it("calls notFound() when organization slug does not exist in database", async () => {
    prismaMock.organization.findUnique.mockResolvedValue(null);

    const { default: OrgLayout } = await import("@/app/org/[orgSlug]/layout");

    await expect(
      OrgLayout({
        children: "Content",
        params: Promise.resolve({ orgSlug: "wrong-slug" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({
      where: { slug: "wrong-slug" },
      select: { id: true, status: true },
    });
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("calls notFound() when organization is SUSPENDED", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "org-1",
      status: "SUSPENDED",
    });

    const { default: OrgLayout } = await import("@/app/org/[orgSlug]/layout");

    await expect(
      OrgLayout({
        children: "Content",
        params: Promise.resolve({ orgSlug: "suspended-org" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders children when organization slug exists and is active", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "org-1",
      status: "ACTIVE",
    });

    const { default: OrgLayout } = await import("@/app/org/[orgSlug]/layout");

    const result = await OrgLayout({
      children: "Valid Content",
      params: Promise.resolve({ orgSlug: "farmiclegrow" }),
    });

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
