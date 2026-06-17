export function buildAdminKpis(input: {
  totalFarmers: number;
  pendingCount: number;
  activeCycles: number;
  totalBatches: number;
  unvalidatedLocationsCount: number;
  avgQuality: number;
  activeListingsCount: number;
  totalOrders: number;
  orgBase: string;
}) {
  return [
    {
      title: "Total Farmers",
      value: input.totalFarmers.toLocaleString(),
      description: "Registered growers in this organization",
      href: `${input.orgBase}/admin/farmers`,
      tone: "default" as const,
    },
    {
      title: "Pending Reviews",
      value: input.pendingCount.toLocaleString(),
      description: "Submissions waiting for admin action",
      href: `${input.orgBase}/admin`,
      tone: "amber" as const,
    },
    {
      title: "Active Cycles",
      value: input.activeCycles.toLocaleString(),
      description: "Production cycles currently in progress",
      href: `${input.orgBase}/agronomist/production`,
      tone: "blue" as const,
    },
    {
      title: "Batches",
      value: input.totalBatches.toLocaleString(),
      description: "Traceable harvest batches created so far",
      href: `${input.orgBase}/agronomist/batches`,
      tone: "slate" as const,
    },
    {
      title: "Unvalidated GPS",
      value: input.unvalidatedLocationsCount.toLocaleString(),
      description: "Farm locations still awaiting validation",
      href: `${input.orgBase}/agronomist/locations`,
      tone: "amber" as const,
    },
    {
      title: "Avg Quality",
      value: `${input.avgQuality}/100`,
      description: "Average farmer quality score",
      href: `${input.orgBase}/admin/farmers`,
      tone: "emerald" as const,
    },
    {
      title: "Market Listings",
      value: input.activeListingsCount.toLocaleString(),
      description: "Live marketplace inventory for buyers",
      href: `${input.orgBase}/admin/inventory`,
      tone: "blue" as const,
    },
    {
      title: "Orders",
      value: input.totalOrders.toLocaleString(),
      description: "Confirmed and in-progress buyer orders",
      href: `${input.orgBase}/admin/orders`,
      tone: "slate" as const,
    },
  ];
}
