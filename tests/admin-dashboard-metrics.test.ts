import { describe, expect, it } from "vitest";
import { buildAdminKpis } from "@/lib/dashboard/admin-kpis";

describe("admin dashboard metrics", () => {
  it("uses a real order count for the orders KPI", () => {
    const cards = buildAdminKpis({
      totalFarmers: 250,
      pendingCount: 7,
      activeCycles: 43,
      totalBatches: 89,
      unvalidatedLocationsCount: 12,
      avgQuality: 76,
      activeListingsCount: 18,
      totalOrders: 31,
      orgBase: "/org/afro-pulse",
    });

    expect(cards.find((card) => card.title === "Orders")).toMatchObject({
      value: "31",
      href: "/org/afro-pulse/admin/orders",
    });
  });
});
